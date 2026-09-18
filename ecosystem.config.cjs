module.exports = {
  apps: [{
    name: "wlmaz",
    script: "./dist/server/index.mjs",
    node_args: "--env-file=.env",
    exec_mode: "cluster",
    instances: 2,
    max_memory_restart: "800M",
    kill_timeout: 5000,
    log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      UV_THREADPOOL_SIZE: "4"
    }
  }]
}
