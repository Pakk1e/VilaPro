const path = require('path');
const PROJECT_ROOT = '/home/parking/parking-orchestrator';

module.exports = {
  apps: [
    {
      name: "parkpro-backend",
      script: "server.js",
      cwd: path.join(PROJECT_ROOT, "backend"),
      env: {
        NODE_ENV: "production",
        PORT: 5000 // Backend port
      }
    },
    {
      name: "parkpro-worker",
      script: "main.py",
      cwd: path.join(PROJECT_ROOT, "orchestrator"),
      interpreter: path.join(PROJECT_ROOT, "orchestrator/.venv/bin/python")
    },
    {
      name: "parkpro-frontend",
      script: "npx",
      // --host allows it to be seen on the Tailscale network
      args: "vite preview --port 3000 --host", 
      cwd: path.join(PROJECT_ROOT, "frontend")
    }
  ]
};