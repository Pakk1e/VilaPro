const path = require('path');

const PROJECT_ROOT = '/home/park-pro/VilaPro';

module.exports = {
  apps: [
    {
      name: "parkpro-api",
      script: "server.js",
      cwd: path.join(PROJECT_ROOT, "backend"),
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        COOKIE_SECRET: process.env.COOKIE_SECRET
      }
    }
  ]
};