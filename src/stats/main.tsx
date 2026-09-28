import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import StatsApp from './StatsApp.tsx';
import './stats.css';

createRoot(document.getElementById('stats-root')!).render(
  <StrictMode>
    <StatsApp />
  </StrictMode>,
);
