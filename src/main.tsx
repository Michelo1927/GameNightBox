import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startNav } from './hub/nav';
import './styles.css';
import './games/jeopardy/creator/creator.css';
import './hub/hub.css';
import './hub/stage.css';
import './hub/motion.css';
import './hub/intro.css';

// After the imports: the games have registered their old addresses (hub/nav.ts addAlias).
startNav();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Rende il sito installabile come app (solo sul sito pubblicato, non in sviluppo).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
