module.exports = {
  apps: [
    {
      name: 'platform-api',
      script: 'dist/server.js',
      cwd: '/home/remus/apps/platform/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // Graceful shutdown: send SIGINT, wait 5s before SIGKILL
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Logging
      error_file: '/home/remus/.pm2/logs/platform-api-error.log',
      out_file: '/home/remus/.pm2/logs/platform-api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
