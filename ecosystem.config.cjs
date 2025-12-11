module.exports = {
  apps: [{
    name: "wlmaz",
    script: "./src/index.ts",
    interpreter: "./node_modules/.bin/tsx",
    node_args: "--env-file=.env",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}