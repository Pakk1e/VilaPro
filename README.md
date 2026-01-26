# Vadovsky Tech

Personal website project hosted at https://www.vadovsky-tech.com

## Overview

This repository contains the source code for my personal website.
The project includes a frontend application and a Node.js backend.

Authentication is handled by a third-party service.
This backend does not store or manage user credentials.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript

### Backend
- Node.js
- Express
- SQLite

### Infrastructure
- Linux server
- Cloudflare (DNS / Proxy)
- Tailscale (internal networking)

## Project Structure

├── frontend/
│ ├── src/
│ └── package.json
├── backend/
│ ├── server.js
│ ├── package.json
│ └── .env.example
└── README.md



## Environment Variables

Backend uses environment variables defined in a `.env` file.

Example:
PORT=5000
TAILSCALE_IP=100.x.x.x


See `backend/.env.example` for reference.

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev


cd backend
npm install
npm start




