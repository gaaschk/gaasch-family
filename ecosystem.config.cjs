// PM2 ecosystem config — checked in, no secrets.
// Secrets are loaded from /var/www/heirloom/.env.production at deploy time
// via `set -a && source .env.production && set +a && pm2 reload --update-env`

module.exports = {
  apps: [
    {
      name: "heirloom",
      script: "server.js",
      cwd: "/var/www/heirloom",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/var/log/heirloom/error.log",
      out_file: "/var/log/heirloom/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "heirloom-worker",
      script: "worker/index.js",
      cwd: "/var/www/heirloom",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/heirloom/worker-error.log",
      out_file: "/var/log/heirloom/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
