# Pulse Observability Dashboard

React + Vite dashboard for the Proxy Monitor API. It displays service health, call volume, success/error rate, average latency, the last 20 requests per service, and a live audit table with filters and expandable request details.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
```

Create `.env.local` from `.env.example`, then run:

```bash
npm run dev
```

Set `VITE_API_URL` to the backend origin (default `http://localhost:8080`). The dashboard polls metrics every three seconds and keeps the page usable when the API is offline.

## Build

```bash
npm run build
npm run preview
```

## Vercel

Import this repository as a Vite project and set `VITE_API_URL` to the public Render gateway origin (`https://microservice-audit-monitor-api.onrender.com`). Configure the backend's `ALLOWED_ORIGINS` with the deployed Vercel origin. `vercel.json` rewrites SPA routes to `index.html`.

Frontend repository: [monitorio-microservicios-FRONTEND](https://github.com/samuelvallejo/monitorio-microservicios-FRONTEND)  
Backend repository: [monitorio-microservicios-BACKEND](https://github.com/samuelvallejo/monitorio-microservicios-BACKEND)  
Production URL: [https://monitorio-microservicios-frontend.vercel.app](https://monitorio-microservicios-frontend.vercel.app)
