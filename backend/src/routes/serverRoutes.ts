import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

let prevNetStats: { [key: string]: { rx: number; tx: number; time: number } } = {};

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
            pm2Result
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
            execAsync("pm2 jlist 2>/dev/null || echo []")
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
            pm2
        };

        res.json(stats);
    } catch (error) {
        console.error("Error fetching server stats:", error);
        res.status(500).json({ error: "Failed to fetch server stats" });
    }
});

export default router;
