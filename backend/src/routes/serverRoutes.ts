import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

let prevNetStats: { [key: string]: { rx: number; tx: number; time: number } } = {};

/*
 * The Pi's schedule, for hub.thisisvillegas.com (2026-11-10): the crontab of the user this process runs as, the
 * systemd services and timers that are not part of Raspberry Pi OS itself, and every failed service. Read live on
 * each call so the hub never drifts from the box. `services` (the count of running services) is unchanged; the
 * new fields are `cron` and `systemd`.
 */
// --- schedule parsers ---
type CronJob = { schedule: string; command: string; name: string | null };
type SystemdUnit = { name: string; description: string; state: string; scope: "system" | "user" };
type SystemdTimer = { name: string; activates: string; next: string | null; last: string | null };

/** Units Raspberry Pi OS (Bookworm/Trixie desktop image) runs on its own, system and user manager alike. Everything
 *  else was put there on purpose and the hub lists it; a failed unit is listed whatever its name. When a stock unit
 *  shows up on the hub, add it here. */
const STOCK_UNITS = new Set([
    "accounts-daemon", "alsa-restore", "alsa-state", "apt-daily", "apt-daily-upgrade", "avahi-daemon", "bluetooth",
    "colord", "console-setup", "cron", "cups", "cups-browsed", "dbus", "dconf", "dphys-swapfile", "dpkg-db-backup",
    "e2scrub_all", "fake-hwclock", "filter-chain", "fstrim", "hciuart", "keyboard-setup", "lightdm", "logrotate",
    "man-db", "ModemManager", "mpris-proxy", "NetworkManager", "nfs-blkmap", "packagekit", "pipewire",
    "pipewire-pulse", "polkit", "pulseaudio", "raspberrypi-net-mods", "rpcbind", "rpi-eeprom-update", "rsyslog",
    "rtkit-daemon", "ssh", "triggerhappy", "udisks2", "upower", "wireplumber", "wpa_supplicant"
]);
const STOCK_UNIT_PATTERNS = [
    /^getty@/, /^serial-getty@/, /^user@/, /^user-runtime-dir@/, /^modprobe@/, /^ifup@/, /^systemd-/, /^plymouth/,
    /^at-spi/, /^evolution-/, /^gnome-/, /^gvfs-/, /^tracker-/, /^xdg-/
];
const isStockUnit = (unit: string): boolean => {
    const name = unit.replace(/\.(service|timer)$/, "");
    return STOCK_UNITS.has(name) || STOCK_UNIT_PATTERNS.some(p => p.test(name));
};

/** `crontab -l` as one entry per active job, in file order. Blank lines, comments (a job disabled with a leading #
 *  included) and VAR=value lines are skipped. A trailing ` # name` on the command, the convention in this crontab,
 *  becomes `name`; the schedule is kept as the cron expression it is. */
function parseCrontab(text: string): CronJob[] {
    const jobs: CronJob[] = [];
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue;
        const m = line.match(/^(@\w+|(?:\S+\s+){4}\S+)\s+(.+)$/);
        if (!m) continue;
        let command = m[2].trim();
        let name: string | null = null;
        const tail = command.match(/^(.*\S)\s+#\s*(\S[^#]*?)\s*$/);
        if (tail) {
            command = tail[1];
            name = tail[2];
        }
        jobs.push({ schedule: m[1].replace(/\s+/g, " "), command, name });
    }
    return jobs;
}

const jsonRows = (text: string): any[] => {
    try {
        const rows = JSON.parse(text);
        return Array.isArray(rows) ? rows : [];
    } catch {
        return [];
    }
};

/** `systemctl list-units --type=service -o json` → the non-stock running services plus every failed one. */
function parseUnits(text: string, scope: "system" | "user"): SystemdUnit[] {
    return jsonRows(text)
        .filter(u => typeof u?.unit === "string" && (u.active === "failed" || u.sub === "failed" || !isStockUnit(u.unit)))
        .map(u => ({
            name: String(u.unit).replace(/\.service$/, ""),
            description: String(u.description ?? ""),
            state: u.active === "failed" ? "failed" : String(u.sub ?? u.active ?? ""),
            scope
        }));
}

/** systemd's JSON carries timestamps in microseconds since the epoch; 0 or missing means never. */
const usecToIso = (v: unknown): string | null =>
    typeof v === "number" && v > 0 ? new Date(Math.floor(v / 1000)).toISOString() : null;

/** `systemctl list-timers --all -o json` → the non-stock timers with their next and last run. */
function parseTimers(text: string): SystemdTimer[] {
    return jsonRows(text)
        .filter(t => typeof t?.unit === "string" && !isStockUnit(t.unit))
        .map(t => ({
            name: String(t.unit).replace(/\.timer$/, ""),
            activates: String(t.activates ?? ""),
            next: usecToIso(t.next),
            last: usecToIso(t.last)
        }));
}
// --- end schedule parsers ---

/** `systemctl --user` needs the user manager's runtime dir; PM2 does not always pass it on. */
const uid = typeof process.getuid === "function" ? process.getuid() : 1000;

router.get("/stats", async (req: Request, res: Response) => {
    try {
        const now = Date.now();
        
        const [
            loadAvgResult,
            meminfoResult,
            diskResult,
            tempResult,
            uptimeResult,
            processResult,
            hostnameResult,
            netDevResult,
            unameResult,
            cpuFreqResult,
            netstatResult,
            servicesResult,
            pm2Result,
            cronResult,
            unitsResult,
            userUnitsResult,
            timersResult
        ] = await Promise.all([
            execAsync("cat /proc/loadavg"),
            execAsync("cat /proc/meminfo"),
            execAsync("df -h / | tail -1"),
            execAsync("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0"),
            execAsync("cat /proc/uptime"),
            execAsync("ps aux --sort=-%mem | head -11"),
            execAsync("hostname -I"),
            execAsync("cat /proc/net/dev"),
            execAsync("uname -r"),
            execAsync("cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null || echo 0"),
            execAsync("ss -tun state established 2>/dev/null | wc -l"),
            execAsync("systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | wc -l"),
            execAsync("pm2 jlist 2>/dev/null || echo []"),
            // Schedule (see the parsers above). Each command answers something on every exit code so one missing
            // crontab or user manager never fails the whole stats call.
            execAsync("crontab -l 2>/dev/null || true"),
            execAsync("systemctl list-units --type=service --state=running,failed --no-pager -o json 2>/dev/null || echo []"),
            execAsync(`XDG_RUNTIME_DIR=/run/user/${uid} systemctl --user list-units --type=service --state=running,failed --no-pager -o json 2>/dev/null || echo []`),
            execAsync("systemctl list-timers --all --no-pager -o json 2>/dev/null || echo []")
        ]);

        // Parse load average
        const loadParts = loadAvgResult.stdout.trim().split(" ");
        const loadAverage = loadParts.slice(0, 3).map(parseFloat);
        const processCount = parseInt(loadParts[3]?.split("/")[1] || "0", 10);

        // Parse uptime
        const uptimeSeconds = parseFloat(uptimeResult.stdout.trim().split(" ")[0]);
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const mins = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeStr = days > 0 ? days + "d " + hours + "h " + mins + "m" : hours > 0 ? hours + "h " + mins + "m" : mins + "m";

        // Parse memory
        const memLines = meminfoResult.stdout.split("\n");
        const getMemVal = (key: string) => {
            const line = memLines.find(l => l.startsWith(key));
            const match = line?.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        };
        const memTotal = getMemVal("MemTotal");
        const memAvailable = getMemVal("MemAvailable");
        const memCached = getMemVal("Cached");
        const swapTotal = getMemVal("SwapTotal");
        const swapFree = getMemVal("SwapFree");
        const memUsed = memTotal - memAvailable;

        // Parse disk
        const diskParts = diskResult.stdout.trim().split(/\s+/);

        // Parse temp and freq
        const cpuTemp = parseInt(tempResult.stdout.trim(), 10) / 1000;
        const cpuFreq = Math.round(parseInt(cpuFreqResult.stdout.trim(), 10) / 1000);

        // Parse processes
        const processLines = processResult.stdout.trim().split("\n").slice(1);
        const processes = processLines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
                user: parts[0] || "",
                pid: parseInt(parts[1] || "0", 10),
                cpuPercent: parseFloat(parts[2] || "0"),
                memPercent: parseFloat(parts[3] || "0"),
                memMB: Math.round(parseInt(parts[5] || "0", 10) / 1024),
                name: parts.slice(10).join(" ") || ""
            };
        });

        const claudeSessions = processes.filter(p => 
            p.name.includes("claude") && !p.name.includes("--type=")
        ).length;

        // Parse network with rates
        const netLines = netDevResult.stdout.trim().split("\n").slice(2);
        const interfaces = netLines
            .filter(line => line.includes("eth0") || line.includes("wlan0"))
            .map(line => {
                const parts = line.trim().split(/\s+/);
                const name = parts[0].replace(":", "");
                const rx = parseInt(parts[1] || "0", 10);
                const tx = parseInt(parts[9] || "0", 10);
                const rxErrors = parseInt(parts[3] || "0", 10);
                const txErrors = parseInt(parts[11] || "0", 10);
                const rxDrops = parseInt(parts[4] || "0", 10);
                const txDrops = parseInt(parts[12] || "0", 10);

                let rxRate = 0, txRate = 0;
                if (prevNetStats[name]) {
                    const dt = (now - prevNetStats[name].time) / 1000;
                    if (dt > 0) {
                        rxRate = Math.max(0, (rx - prevNetStats[name].rx) / dt);
                        txRate = Math.max(0, (tx - prevNetStats[name].tx) / dt);
                    }
                }
                prevNetStats[name] = { rx, tx, time: now };

                return { name, ip: "", rx, tx, rxRate, txRate, errors: rxErrors + txErrors, drops: rxDrops + txDrops };
            });

        const ips = hostnameResult.stdout.trim().split(" ");
        interfaces.forEach(iface => {
            if (iface.name === "eth0") iface.ip = ips[0] || "";
            if (iface.name === "wlan0") iface.ip = ips[1] || ips[0] || "";
        });

        // Parse connections
        const connCount = Math.max(0, parseInt(netstatResult.stdout.trim(), 10) - 1);

        // Parse PM2
        let pm2Apps: any[] = [];
        try {
            pm2Apps = JSON.parse(pm2Result.stdout.trim());
        } catch {}

        const pm2 = pm2Apps.map((app: any) => ({
            name: app.name,
            status: app.pm2_env?.status || "unknown",
            cpu: app.monit?.cpu || 0,
            mem: Math.round((app.monit?.memory || 0) / 1024 / 1024),
            uptime: app.pm2_env?.pm_uptime ? Math.floor((Date.now() - app.pm2_env.pm_uptime) / 1000) : 0,
            restarts: app.pm2_env?.restart_time || 0
        }));

        // Parse the schedule: crontab, then the non-stock systemd services (system first, then the user manager) and timers
        const cron = parseCrontab(cronResult.stdout);
        const systemd = {
            services: [...parseUnits(unitsResult.stdout, "system"), ...parseUnits(userUnitsResult.stdout, "user")],
            timers: parseTimers(timersResult.stdout)
        };

        const stats = {
            timestamp: new Date().toISOString(),
            system: {
                hostname: "remusservers",
                uptime: uptimeStr,
                uptimeSeconds,
                loadAverage,
                cpuTemp,
                cpuFreq,
                kernel: unameResult.stdout.trim(),
                processCount
            },
            memory: {
                total: memTotal,
                available: memAvailable,
                used: memUsed,
                usedPercent: Math.round((memUsed / memTotal) * 100),
                cached: memCached,
                swap: { total: swapTotal, free: swapFree, used: swapTotal - swapFree }
            },
            disk: {
                total: diskParts[1] || "",
                used: diskParts[2] || "",
                available: diskParts[3] || "",
                usedPercent: parseInt(diskParts[4]?.replace("%", "") || "0", 10)
            },
            network: { 
                interfaces, 
                connections: connCount 
            },
            processes,
            claudeSessions,
            services: parseInt(servicesResult.stdout.trim(), 10),
            pm2,
            cron,
            systemd
        };

        res.json(stats);
    } catch (error) {
        console.error("Error fetching server stats:", error);
        res.status(500).json({ error: "Failed to fetch server stats" });
    }
});

export default router;
