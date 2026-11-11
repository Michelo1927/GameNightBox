import type { Game } from '../hub/games';
import jeopardy from './jeopardy';
import passaparola from './passaparola';
import catena from './catena';
import musichiere from './musichiere';
import topten from './topten';
import sbagliato from './sbagliato';

/** Every game of the hub, in the order shown on the home page. To add one, create src/games/<id>/ and list it here. */
export const games: Game[] = [jeopardy, passaparola, catena, musichiere, topten, sbagliato];
