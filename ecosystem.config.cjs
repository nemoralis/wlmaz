module.exports = {
  apps: [{
    name: "wlmaz",
    script: "./dist/server/index.mjs",
    node_args: "--env-file=.env",
    exec_mode: "cluster",
    instances: 2,
    max_memory_restart: "800M",
    // Commons uploads can take up to 30s. PM2 must not SIGKILL the worker
    // before Express has had time to drain those requests.
    kill_timeout: 40000,
    log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      UV_THREADPOOL_SIZE: "4"
    }
  }]
}
