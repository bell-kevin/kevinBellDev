import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production builds ship prerendered markup (see scripts/prerender.mjs), so
// hydrate it instead of throwing it away. `vite dev` serves an empty root.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}

// Tells the bootstrap script in index.html that the bundle really did run, so
// it leaves html.js in place. Re-adding `js` covers the case where the check
// already fired and stripped it.
document.documentElement.classList.add('js', 'js-ready');
