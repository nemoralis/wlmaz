module.exports = {
  apps: [{
    name: "wlmaz",
    script: "./src/index.ts",
    interpreter: "./node_modules/.bin/tsx",
    node_args: "--env-file=.env",
    log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}