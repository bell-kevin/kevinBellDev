import { renderToString } from 'react-dom/server';
import App from './App.tsx';

// Rendered at build time by scripts/prerender.mjs so that the shipped
// index.html already contains the whole page. Browsers with JavaScript
// disabled get the real site; browsers with it enabled hydrate this markup.
export function render() {
  return renderToString(<App />);
}
