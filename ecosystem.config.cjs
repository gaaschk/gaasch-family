// PM2 ecosystem config — checked in, no secrets.
// Secrets live in /var/www/heirloom/.env.production on the server (never committed).
// PM2 loads that file directly via env_file so the daemon always has the right env,
// even after a server reboot.

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
      env_file: "/var/www/heirloom/.env.production",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/var/log/heirloom/error.log",
      out_file: "/var/log/heirloom/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    // heirloom-worker will be added here when the BullMQ worker is built
    // {
    //   name: "heirloom-worker",
    //   script: "worker/index.js",
    //   ...
    // }
  ],
};
