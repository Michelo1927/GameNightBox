import { useEffect, useMemo, useState } from 'react';
import type { Game } from './games';
import { ask } from './ask';
import { go } from './nav';
import { decodePack, encodePack, packFileName, resolve, savePack, type Pack, type PackItem, type Resolved } from './pack';
import { setPendingPack } from './tournament';
import type { PackContent } from './tournament';
import { copyText } from './text';
import { loadSaved } from './useSaved';
import { BackPill } from './components/BackButton';
import { AiLinks, fixRequest, FormFields, readAnswer, type Form } from './components/ClaudeCreate';
import { IconDisk } from './components/GameIcon';
import TutorialButton from './components/Tutorial';
import { PACK_LOAD_TUTORIAL, PACK_TUTORIAL } from './tutorials';
import { locale, tr } from './i18n';
import './pack.css';

// Pages of the packs (pack.ts): #/pacchetto (make one) and #/pacchetto/carica[/<code>] (open one).

export function PackRoute({ games, view, code }: { games: Game[]; view?: string; code?: string }) {
  if (view === 'carica') return <PackLoad key={code ?? ''} games={games} code={code} />;
  return <PackCreate games={games} />;
}

// ---------- Make a pack ----------

/** A game of the pack being made: written by an AI (form + answer) or one already made (from the site or this device). */
interface DraftItem {
  id: string;
  game: string;
  /** AI: the game's own fields (theme and audience empty = the pack's). */
  form?: Form;
  answer?: string;
  /** The content: read from the answer (and maybe fixed in the preview), or the one chosen. */
  data?: unknown;
  /** One of the site's contents, by slug. */
  site?: string;
}

interface PackDraft {
  title: string;
  author: string;
  topic: string;
  audience: string;
  items: DraftItem[];
}

const DRAFT_KEY = 'gnb:pacchetto:draft';
const emptyDraft = (): PackDraft => ({ title: '', author: '', topic: '', audience: '', items: [] });
const newId = () => Math.random().toString(36).slice(2, 9);

/** The pack's theme and audience fill the fields left empty. */
const COMMON = ['topic', 'audience'] as const;

function PackCreate({ games }: { games: Game[] }) {
  const [draft, setDraft] = useState<PackDraft>(() => loadSaved<PackDraft>(DRAFT_KEY) ?? emptyDraft());
  const [open, setOpen] = useState<string | null>(() => draft.items.find((i) => !i.data)?.id ?? null);
  const [copied, setCopied] = useState('');
  const [pickGame, setPickGame] = useState('');
  const [pickSlug, setPickSlug] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* no room: the page still works until it is closed */
    }
  }, [draft]);

  const gameOf = (id: string) => games.find((g) => g.id === id);
  const set = (patch: Partial<PackDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setItem = (id: string, patch: Partial<DraftItem>) => setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const copy = async (what: string, text: string) => setCopied((await copyText(text)) ? what : '');

  const checked = draft.items.map((i): Resolved => {
    const item: PackItem = i.site ? { game: i.game, site: i.site } : { game: i.game, data: i.data };
    if (!i.site && i.data === undefined) return { item, game: gameOf(i.game), title: '', summary: '', errors: [tr('Manca la risposta dell’IA', 'The AI’s answer is missing')] };
    return resolve(item, games);
  });
  const ready = checked.filter((r) => !r.errors.length).length;
  const missing = !draft.title.trim()
    ? tr('Dai un titolo al pacchetto', 'Give the pack a title')
    : !draft.items.length
      ? tr('Aggiungi almeno una partita', 'Add at least one game')
      : ready < draft.items.length
        ? tr(`Pronte ${ready} partite su ${draft.items.length}: completa le altre`, `${ready} of ${draft.items.length} games ready: complete the others`)
        : '';

  // A new code whenever the pack changes; the old one is not shown any more.
  const pack: Pack | null = missing ? null : { title: draft.title.trim(), ...(draft.author.trim() && { author: draft.author.trim() }), items: checked.map((r) => r.item) };
  const packJson = pack ? JSON.stringify(pack) : '';
  useEffect(() => {
    setCode('');
    if (pack) encodePack(pack).then(setCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packJson]);

  const addAi = (game: Game) => {
    const id = newId();
    const form = { ...game.content.ai.initial };
    for (const k of COMMON) if (k in form) form[k] = '';
    set({ items: [...draft.items, { id, game: game.id, form, answer: '' }] });
    setOpen(id);
  };
  const pickable = pickGame ? gameOf(pickGame)?.content.all().filter((c) => !c.errors.length) ?? [] : [];
  const addExisting = () => {
    const c = pickable.find((x) => x.slug === pickSlug);
    if (!c) return;
    const item: DraftItem = c.local ? { id: newId(), game: pickGame, data: c.data } : { id: newId(), game: pickGame, site: c.slug };
    set({ items: [...draft.items, item] });
    setPickSlug('');
  };
  const remove = async (i: DraftItem) => {
    if (i.data !== undefined && !(await ask(tr('Togliere questa partita dal pacchetto?', 'Remove this game from the pack?'), tr('Togli', 'Remove')))) return;
    set({ items: draft.items.filter((x) => x.id !== i.id) });
  };
  const move = (index: number, by: number) => {
    const items = [...draft.items];
    const [it] = items.splice(index, 1);
    items.splice(index + by, 0, it);
    set({ items });
  };
  const restart = async () => {
    if (await ask(tr('Ricominciare da zero? Il pacchetto che stai preparando si cancella.', 'Start over? The pack you are making is deleted.'), tr('Ricomincia', 'Start over'))) {
      setDraft(emptyDraft());
      setOpen(null);
    }
  };

  /** The prompt of an AI game: its fields, the pack's theme and audience, and what the games before it already used. */
  const promptOf = (i: DraftItem, index: number) => {
    const game = gameOf(i.game)!;
    const form = { ...i.form };
    for (const k of COMMON) if (k in form && !String(form[k] ?? '').trim()) form[k] = draft[k];
    let text = game.content.ai.prompt(form);
    const used = draft.items.slice(0, index).flatMap((x, j) => {
      if (x.game !== i.game || checked[j].errors.length) return [];
      try {
        return game.content.used(x.site ? game.content.all().find((c) => c.slug === x.site)?.data : x.data);
      } catch {
        return [];
      }
    });
    if (used.length)
      text += tr(
        `\n\nIMPORTANTE: questa partita fa parte di una serata con altre partite dello stesso gioco, già pronte. Non usare di nuovo queste cose, né cose troppo simili: ${used.join('; ')}.`,
        `\n\nIMPORTANT: this game is part of a night with other games of the same kind, already made. Don't use these again, nor things too similar: ${used.join('; ')}.`,
      );
    return text;
  };

  const readItem = (i: DraftItem, answer: string) => {
    const game = gameOf(i.game)!;
    const r = readAnswer(answer, game.content.ai.validate);
    setItem(i.id, { answer, data: r.data ?? undefined });
    // Done: on to the next game still to make.
    if (r.data && !r.errors.length) {
      const next = draft.items.find((x) => x.id !== i.id && !x.site && x.data === undefined);
      setOpen(next?.id ?? null);
    }
  };

  const fileName = packFileName(draft.title);
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const file = code ? new File([code], fileName, { type: 'text/plain' }) : null;
  const canShare = !!file && !!navigator.canShare?.({ files: [file] });
  const shareFile = async () => {
    try {
      await navigator.share({ files: [file!], title: draft.title });
    } catch {
      /* share sheet closed */
    }
  };
  const count = (id: string) => draft.items.filter((x) => x.game === id).length;

  return (
    <div className="creator claude-page pack-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>🎁 {tr('Prepara un pacchetto', 'Make a pack')}</h1>
        <TutorialButton tutorial={PACK_TUTORIAL} />
      </header>
      <p className="cr-tip">
        {tr(
          <>
            Prepara tutte le partite di una serata per qualcun altro (es. lo streamer per cui fai il mod): aggiungi i giochi, per ognuno copia il
            prompt in un'IA (<b>ChatGPT, Claude, Gemini…</b>) e incolla qui la risposta. Alla fine scarichi <b>un solo file</b>: chi lo apre trova
            tutte le partite pronte, anche per un torneo. Il lavoro resta salvato su questo dispositivo.
          </>,
          <>
            Make all the games of a night for someone else (e.g. the streamer you mod for): add the games, for each one copy the prompt into an AI
            (<b>ChatGPT, Claude, Gemini…</b>) and paste the answer here. At the end you download <b>a single file</b>: whoever opens it finds all the
            games ready, even for a tournament. Your work stays saved on this device.
          </>,
        )}
      </p>

      <section className="cr-cat pack-info">
        <div className="cr-label">1 · {tr('Il pacchetto', 'The pack')}</div>
        <label className="cr-field">
          <span className="cr-label">{tr('Titolo', 'Title')}</span>
          <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr('Es. Serata di venerdì', 'E.g. Friday night')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Chi lo prepara (facoltativo)', 'Made by (optional)')}</span>
          <input value={draft.author} onChange={(e) => set({ author: e.target.value })} placeholder={tr('Il tuo nome', 'Your name')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Tema per tutte le partite (facoltativo)', 'Theme for every game (optional)')}</span>
          <input value={draft.topic} onChange={(e) => set({ topic: e.target.value })} placeholder={tr('Es. videogiochi, anni 2000…', 'E.g. video games, the 2000s…')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Chi gioca (facoltativo)', 'Who is playing (optional)')}</span>
          <input value={draft.audience} onChange={(e) => set({ audience: e.target.value })} placeholder={tr('Es. la community di uno streamer, 18-30 anni', "E.g. a streamer's community, 18-30")} />
        </label>
      </section>

      <section className="cr-cat">
        <div className="cr-label">
          2 · {tr('Le partite', 'The games')} <span className="muted">{tr(`${ready} pronte su ${draft.items.length}`, `${ready} of ${draft.items.length} ready`)}</span>
        </div>
        {draft.items.length > 0 && <AiLinks />}

        <ol className="pack-items">
          {draft.items.map((i, index) => {
            const game = gameOf(i.game);
            const r = checked[index];
            const nth = draft.items.slice(0, index + 1).filter((x) => x.game === i.game).length;
            const isOpen = open === i.id;
            const ok = !r.errors.length;
            const status = i.site
              ? tr('dal sito', 'from the site')
              : !i.form
                ? tr('già pronta', 'ready-made')
                : i.data === undefined
                  ? tr('da fare', 'to do')
                  : ok
                    ? ''
                    : tr('da correggere', 'to fix');
            return (
              <li key={i.id} className={`pack-item theme-${i.game} ${ok ? 'ok' : ''} ${isOpen ? 'open' : ''}`}>
                <div className="pack-item-head">
                  <button className="pack-item-main" onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen} disabled={!i.form}>
                    {game && <IconDisk icon={game.icon} />}
                    <span className="pack-item-text">
                      <b>{game?.name ?? i.game}{count(i.game) > 1 ? ` · ${nth}` : ''}</b>
                      <span className="muted">
                        {ok ? '✓ ' : r.errors.length && i.data !== undefined ? '❌ ' : '⏳ '}
                        {r.title || status}
                        {r.summary && ` · ${r.summary}`}
                        {status && r.title && ` · ${status}`}
                      </span>
                    </span>
                  </button>
                  <span className="pack-item-tools">
                    <button className="btn ghost small" onClick={() => move(index, -1)} disabled={index === 0} aria-label={tr('Sposta su', 'Move up')}>↑</button>
                    <button className="btn ghost small" onClick={() => move(index, 1)} disabled={index === draft.items.length - 1} aria-label={tr('Sposta giù', 'Move down')}>↓</button>
                    <button className="btn ghost small" onClick={() => remove(i)} aria-label={tr('Togli', 'Remove')}>✕</button>
                  </span>
                </div>

                {isOpen && game && i.form && (
                  <div className="pack-item-body">
                    <FormFields
                      fields={game.content.ai.fields}
                      form={i.form}
                      set={(patch) => setItem(i.id, { form: { ...i.form, ...patch } })}
                      hint={(f) => (COMMON.includes(f.key as (typeof COMMON)[number]) && draft[f.key as (typeof COMMON)[number]].trim() ? `${tr('Come il pacchetto', 'As the pack')}: ${draft[f.key as (typeof COMMON)[number]]}` : undefined)}
                    />
                    <button className="btn primary big" onClick={() => copy(`prompt-${i.id}`, promptOf(i, index))}>
                      {copied === `prompt-${i.id}` ? tr('✓ Prompt copiato: incollalo in una chat nuova', '✓ Prompt copied: paste it in a new chat') : tr('📋 Copia il prompt', '📋 Copy the prompt')}
                    </button>
                    <details className="cr-more">
                      <summary>{tr('Vedi il prompt', 'See the prompt')}</summary>
                      <pre className="prompt-text">{promptOf(i, index)}</pre>
                    </details>
                    <textarea
                      rows={5}
                      value={i.answer ?? ''}
                      onChange={(e) => readItem(i, e.target.value)}
                      placeholder={tr("Incolla qui tutto quello che ha risposto l'IA…", 'Paste here everything the AI answered…')}
                    />
                    {i.data !== undefined && r.errors.length > 0 && (
                      <>
                        <ul className="cr-error">
                          {r.errors.slice(0, 8).map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                          {r.errors.length > 8 && <li>{tr(`…e altri ${r.errors.length - 8}`, `…and ${r.errors.length - 8} more`)}</li>}
                        </ul>
                        <button className="btn ghost" onClick={() => copy(`fix-${i.id}`, fixRequest(r.errors))}>
                          {copied === `fix-${i.id}`
                            ? tr('✓ Copiato: incollalo nella stessa chat', '✓ Copied: paste it in the same chat')
                            : tr("🔧 Copia la richiesta di correzione per l'IA", '🔧 Copy the fix request for the AI')}
                        </button>
                      </>
                    )}
                    {i.data !== undefined && game.content.ai.preview(i.data, (d) => setItem(i.id, { data: d }))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="cr-label">{tr("＋ Aggiungi una partita da fare con l'IA", '＋ Add a game to make with AI')}</div>
        <div className="pack-add">
          {games.map((g) => (
            <button key={g.id} className={`pack-add-game theme-${g.id}`} onClick={() => addAi(g)}>
              <IconDisk icon={g.icon} />
              <span>{g.name}</span>
              {count(g.id) > 0 && <b>×{count(g.id)}</b>}
            </button>
          ))}
        </div>

        <div className="cr-label">{tr('＋ Oppure una già pronta (del sito o tua)', '＋ Or a ready-made one (from the site or yours)')}</div>
        <div className="pack-pick">
          <select value={pickGame} onChange={(e) => { setPickGame(e.target.value); setPickSlug(''); }}>
            <option value="">{tr('Gioco…', 'Game…')}</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select value={pickSlug} onChange={(e) => setPickSlug(e.target.value)} disabled={!pickGame}>
            <option value="">{tr('Partita…', 'Game…')}</option>
            {pickable.map((c) => (
              <option key={c.slug} value={c.slug}>{gameOf(pickGame)!.content.title(c.data)}{c.local ? ` (${tr('tua', 'yours')})` : ''}</option>
            ))}
          </select>
          <button className="btn ghost" onClick={addExisting} disabled={!pickSlug}>{tr('Aggiungi', 'Add')}</button>
        </div>
      </section>

      <section className="cr-cat">
        <div className="cr-label">3 · {tr('Il file da mandare', 'The file to send')}</div>
        {missing ? (
          <p className="cr-error">{missing}</p>
        ) : (
          <p className="cr-tip">
            {tr(
              <>Manda il file a chi giocherà: dalla home, <b>🎁 Pacchetto di partite → 📥 Carica</b>, e apre il file.</>,
              <>Send the file to whoever will play: from the home page, <b>🎁 Pack of games → 📥 Load</b>, then open the file.</>,
            )}
          </p>
        )}
        <div className="cr-share">
          <button className="btn primary big" onClick={download} disabled={!code}>💾 {tr('Scarica il pacchetto', 'Download the pack')}</button>
          {canShare && <button className="btn ghost" onClick={shareFile}>📤 {tr('Condividi file', 'Share file')}</button>}
          <button className="btn ghost" onClick={() => copy('code', code)} disabled={!code}>
            {copied === 'code' ? tr('✓ Codice copiato', '✓ Code copied') : `📋 ${tr('Copia codice', 'Copy code')}`}
          </button>
        </div>
        {code && <p className="cr-hint">{fileName} · {code.length.toLocaleString(locale)} {tr('caratteri', 'characters')}</p>}
        {draft.items.length > 0 && <button className="btn ghost pack-restart" onClick={restart}>🗑 {tr('Ricomincia da zero', 'Start over')}</button>}
      </section>
    </div>
  );
}

// ---------- Open a pack ----------

function PackLoad({ games, code }: { games: Game[]; code?: string }) {
  const [text, setText] = useState('');
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Record<string, PackContent[]> | null>(null);
  const resolved = useMemo(() => (pack ? pack.items.map((i) => resolve(i, games)) : []), [pack, games]);
  const good = resolved.filter((r) => !r.errors.length);

  const read = async (input: string) => {
    setError('');
    setPack(null);
    setSaved(null);
    if (!input.trim()) return;
    setBusy(true);
    try {
      setPack(await decodePack(input));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (code) read(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  const openFile = async (file?: File) => {
    if (!file) return;
    const content = await file.text();
    setText(content.length > 2000 ? `${content.slice(0, 2000)}…` : content);
    read(content);
  };

  const loadAll = () => {
    try {
      setSaved(savePack(resolved));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const games2 = saved ? Object.values(saved).reduce((n, l) => n + l.length, 0) : 0;
  const tournament = () => {
    setPendingPack({ title: pack!.title, contents: saved! });
    go('/torneo/nuovo');
  };
  const slugOf = (r: Resolved) => {
    const list = saved?.[r.game!.id] ?? [];
    const k = good.filter((x) => x.game?.id === r.game!.id).indexOf(r);
    return list[k]?.slug;
  };

  return (
    <div className="import-page pack-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>📥 {tr('Carica un pacchetto', 'Load a pack')}</h1>
        <TutorialButton tutorial={PACK_LOAD_TUTORIAL} />
      </header>
      {!code && (
        <>
          <p className="cr-tip">
            {tr(
              <>Apri il file del pacchetto che ti hanno mandato (o incolla il suo codice, inizia con <b>GNB1.</b>): tutte le sue partite si caricano insieme.</>,
              <>Open the pack file you were sent (or paste its code, it starts with <b>GNB1.</b>): all its games are loaded together.</>,
            )}
          </p>
          <label className="cr-file pack-file">
            📂 {tr('Apri il file', 'Open the file')}
            <input type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={(e) => openFile(e.target.files?.[0])} />
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              read(e.target.value);
            }}
            placeholder={tr('…oppure incolla qui il codice', '…or paste the code here')}
          />
        </>
      )}
      {busy && <p className="muted">{tr('Lettura…', 'Reading…')}</p>}
      {error && <p className="cr-error">{error}</p>}

      {pack && (
        <div className="cr-cat">
          <h2 style={{ margin: 0 }}>🎁 {pack.title}</h2>
          {pack.author && <p className="muted" style={{ margin: 0 }}>{tr('di', 'by')} {pack.author}</p>}
          <ol className="pack-items">
            {resolved.map((r, k) => {
              const slug = saved && !r.errors.length ? slugOf(r) : undefined;
              return (
                <li key={k} className={`pack-item theme-${r.item.game} ${r.errors.length ? '' : 'ok'}`}>
                  <div className="pack-item-head">
                    <span className="pack-item-main">
                      {r.game && <IconDisk icon={r.game.icon} />}
                      <span className="pack-item-text">
                        <b>{r.game?.name ?? r.item.game}</b>
                        <span className="muted">
                          {r.errors.length ? '❌ ' : saved ? '✓ ' : ''}
                          {r.title}
                          {r.summary && ` · ${r.summary}`}
                        </span>
                        {r.errors.length > 0 && <span className="cr-error">{r.errors.slice(0, 2).join('; ')}</span>}
                      </span>
                    </span>
                    {slug && (
                      <span className="pack-item-tools">
                        <button className="btn ghost small" onClick={() => go(`/${r.item.game}/${encodeURIComponent(slug)}/setup`)}>▶ {tr('Gioca', 'Play')}</button>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {!saved ? (
            <button className="btn primary big" onClick={loadAll} disabled={!good.length}>
              📥 {good.length === resolved.length
                ? tr(`Carica tutto (${good.length} partite)`, `Load everything (${good.length} games)`)
                : tr(`Carica le ${good.length} partite valide`, `Load the ${good.length} valid games`)}
            </button>
          ) : (
            <>
              <p className="pack-done">✓ {tr(`${games2} partite caricate: le trovi anche nei loro giochi, tra "Le tue".`, `${games2} games loaded: you also find them in their games, under "Yours".`)}</p>
              <div className="cr-share">
                {games2 >= 2 && <button className="btn primary big" onClick={tournament}>🏆 {tr('Inizia il torneo', 'Start the tournament')}</button>}
                <a className="btn ghost" href="#/">{tr('Torna alla home', 'Back to the home page')}</a>
              </div>
              {games2 >= 2 && <p className="cr-hint">{tr('Nel torneo la ruota sceglie il gioco e la partita del pacchetto è già pronta: scegli solo le squadre.', 'In the tournament the wheel picks the game and the pack’s game is already set: you only choose the teams.')}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
