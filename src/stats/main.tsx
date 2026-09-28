import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { statsOrigin } from '../analytics/origin.ts';
import StatsApp from './StatsApp.tsx';
import './stats.css';

// On a site without the statistics service, go to the one that has it.
const origin = statsOrigin();
if (origin) {
  location.replace(`${origin}/stats/${location.search}`);
} else {
  createRoot(document.getElementById('stats-root')!).render(
    <StrictMode>
      <StatsApp />
    </StrictMode>,
  );
}
