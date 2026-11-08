import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EditorHome from './EditorHome';
import QuizEditor from './QuizEditor';
import '../../../styles.css';
import './editor.css';

// Separate entry from the game on purpose: it never imports the bundled quiz list, so
// hot reloads triggered by saving or uploading files don't remount the editor and lose edits.
// Routes: editor.html#/  (list)   editor.html#/<slug>  (edit one quiz)
function EditorApp() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const slug = decodeURIComponent(hash.replace(/^#\/?/, '').split('/')[0] ?? '');
  return slug ? <QuizEditor key={slug} slug={slug} /> : <EditorHome />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
