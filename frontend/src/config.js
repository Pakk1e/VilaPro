// This automatically detects the IP of the machine hosting the dashboard
const HOST_IP = window.location.hostname; 
export const API_BASE_URL = `http://${HOST_IP}:5000`;
