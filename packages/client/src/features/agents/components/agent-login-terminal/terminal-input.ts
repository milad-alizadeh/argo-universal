import { authTerminalInputLimit } from '@repo/contracts';

export function* terminalInputChunks(text: string): Generator<string> {
  let chunk = '';

  for (const character of text) {
    if (chunk.length + character.length > authTerminalInputLimit) {
      yield chunk;
      chunk = '';
    }

    chunk += character;
  }

  yield* remainingChunk(chunk);
}

function* remainingChunk(chunk: string): Generator<string> {
  if (chunk) yield chunk;
}
