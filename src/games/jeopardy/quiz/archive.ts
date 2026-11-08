// Quizzes moved out of the home screen. Kept only in this browser: each device has its own archive.
const KEY = 'jeopardy-quiz:archived';

export function archivedSlugs(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function setArchived(slug: string, archived: boolean): string[] {
  const list = archivedSlugs().filter((s) => s !== slug);
  if (archived) list.push(slug);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* not persisted */
  }
  return list;
}
