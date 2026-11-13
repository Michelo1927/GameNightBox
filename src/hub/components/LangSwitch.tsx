import { createPortal } from 'react-dom';
import { lang, LANGS, setLang } from '../i18n';

/** IT / EN, fixed in the top right corner of the home, next to the "?" button. Choosing reloads the page. */
export default function LangSwitch() {
  return createPortal(
    <div className="lang-switch" role="group" aria-label="Lingua / Language">
      {LANGS.map((l) => (
        <button
          key={l}
          className={l === lang ? 'on' : ''}
          aria-pressed={l === lang}
          title={l === 'it' ? 'Italiano' : 'English'}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>,
    document.body,
  );
}
