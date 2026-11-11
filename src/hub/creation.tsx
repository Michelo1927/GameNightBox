// Routes to make and share content, the same for every game but Jeopardy:
//   #/<game>/crea          the game's creator (its own Editor)
//   #/<game>/crea/nuovo    same, starting blank if the last one was already shared
//   #/<game>/crea/codice   code and link to share
//   #/<game>/carica[/<c>]  paste a code or open a shared link
import type { ComponentType, ReactNode } from 'react';
import type { Library, Validation } from './content';
import { freshDraft } from './draft';
import { redirect } from './nav';
import ImportCode from './components/ImportCode';
import SharePage from './components/SharePage';

export interface Creation<T> {
  game: string;
  /** "un Passaparola", "una serie di catene"… */
  a: string;
  prefix: string;
  lib: Library<T>;
  validate: (d: unknown) => Validation;
  summary: (d: T) => string;
  /** Tidies what was typed before saving (trims, drops empty optional fields). */
  clean: (d: T) => T;
  Editor: ComponentType;
}

export function creationRoute<T extends { title: string; author?: string }>(c: Creation<T>, [, page, arg]: string[]): ReactNode | null {
  if (page === 'crea') {
    if (arg === 'nuovo') {
      freshDraft(c.game);
      redirect(`#/${c.game}/crea`);
    }
    if (arg === 'codice') return <SharePage<T> game={c.game} prefix={c.prefix} lib={c.lib} validate={c.validate} clean={c.clean} />;
    return <c.Editor />;
  }
  if (page === 'carica')
    return <ImportCode<T> key={arg ?? ''} game={c.game} what={c.a} prefix={c.prefix} lib={c.lib} validate={c.validate} summary={c.summary} code={arg} />;
  return null;
}
