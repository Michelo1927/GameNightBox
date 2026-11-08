// Quiz <-> shareable text code ("JQ1." + base64url of the deflated JSON), see hub/share.ts.
// The same format is read by scripts/import-code.ts to save a shared quiz into the repo.
import { decode, encode } from '../../../hub/share';
import { validateQuiz, type Quiz } from './schema';

const PREFIX = 'JQ1.';

export const encodeQuiz = (quiz: Quiz): Promise<string> => encode(PREFIX, quiz);

/** Accepts a code, a link containing it (…#/carica/<code>) or plain quiz JSON. */
export async function decodeQuiz(input: string): Promise<Quiz> {
  const data = await decode(input, PREFIX);
  const { errors } = validateQuiz(data);
  if (errors.length) throw new Error(`Il quiz contiene errori: ${errors.slice(0, 3).join('; ')}`);
  return data as Quiz;
}
