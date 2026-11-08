import type { Game } from '../hub/games';
import jeopardy from './jeopardy';

/** Every game of the hub, in the order shown on the home page. To add one, create src/games/<id>/ and list it here. */
export const games: Game[] = [jeopardy];
