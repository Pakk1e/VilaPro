const path = require('path');
const PROJECT_ROOT = '/home/parking/parking-orchestrator';

module.exports = {
  apps: [
    {
      name: "parkpro-api",
      script: "server.js",
      cwd: path.join(PROJECT_ROOT, "backend"),
      env: {
        NODE_ENV: "production",
        PORT: 5000, // Backend port
        COOKIE_SECRET: "9930c223072405cc0945798eb88bcc1b04025939c19bd889d8e3d9107cfebbd8"
      }
    },
    {
      name: "parkpro-weather",
      script: "weather_server.js", // The new standalone file
      cwd: path.join(PROJECT_ROOT, "weather_service"), // Or a separate folder if you prefer
      env: {
        NODE_ENV: "production",
        PORT: 5001 // Dedicated port for weather
      }
    },
  ]
};