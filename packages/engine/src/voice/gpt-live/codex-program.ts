import { isExecutable, resolveExecutable } from '@repo/executables';

// Where the Codex program may be, as this machine answers.
export type CodexPlaces = {
  // The program the CODEX_PATH variable names.
  codexPath: string | undefined;
  platform: NodeJS.Platform;
  // Codex on PATH; throws when PATH has none.
  onPath: (command: string) => string;
  isExecutable: (file: string) => boolean;
};

// The Codex the ChatGPT desktop app carries on a Mac, for a person who installed no Codex of their own.
const chatGptAppCodex =
  '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';

const appCodex = (places: CodexPlaces): string | undefined =>
  places.platform === 'darwin' && places.isExecutable(chatGptAppCodex)
    ? chatGptAppCodex
    : undefined;

function onPathOrApp(places: CodexPlaces): string {
  try {
    return places.onPath('codex');
  } catch (error) {
    const found = appCodex(places);

    if (found) return found;
    throw error;
  }
}

const thisMachine = (): CodexPlaces => ({
  codexPath: process.env.CODEX_PATH,
  platform: process.platform,
  onPath: resolveExecutable,
  isExecutable,
});

// Finds the Codex program: the one CODEX_PATH names, else Codex on PATH, else the ChatGPT app's on a Mac. Throws when there is none.
export function findCodex(places: CodexPlaces = thisMachine()): string {
  return places.codexPath ?? onPathOrApp(places);
}
