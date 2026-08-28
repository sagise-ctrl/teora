/* eslint-env node */
module.exports = {
  apps: [
    {
      name: "teora-api",
      script: "./dist/index.mjs",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      // Logging
      error_file: "/var/log/teora/api-error.log",
      out_file: "/var/log/teora/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
