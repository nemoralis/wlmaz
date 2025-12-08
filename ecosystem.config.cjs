module.exports = {
  apps: [{
    name: "wlmaz-backend",
    script: "./src/index.ts",     // Point directly to your TS file
    interpreter: "./node_modules/.bin/tsx", // Use the installed tsx binary
    node_args: "--env-file=.env", // Native Node 24 env support
    env: {
      NODE_ENV: "production",
      PORT: 3000                  // Ensure your src/index.ts listens on this
    }
  }]
}