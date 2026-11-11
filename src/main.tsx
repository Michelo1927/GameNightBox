import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './games/jeopardy/creator/creator.css';
import './hub/hub.css';
import './hub/stage.css';
import './hub/motion.css';
import './hub/intro.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Rende il sito installabile come app (solo sul sito pubblicato, non in sviluppo).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
