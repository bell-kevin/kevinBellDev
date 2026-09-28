import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import { startTracking } from './analytics/tracker.ts';
import './index.css';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production builds ship prerendered markup (see vite.config.ts), so
// hydrate it instead of throwing it away. `vite dev` serves an empty root.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}

// Visit statistics for the private dashboard at /stats/. The development
// server has no /api/collect, so only production builds report.
if (import.meta.env.PROD) startTracking();
