import { loginTerminalInputLimit } from '@repo/contracts';
const controlOffset = 64;
const lastControlCode = 95;
export const terminalControl = (text: string): string => {
  if (text.length !== 1) return text;
  const code = text.toUpperCase().charCodeAt(0);
  return isControlCode(code) ? String.fromCharCode(code - controlOffset) : text;
};
export function* terminalInputChunks(text: string): Generator<string> {
  let chunk = '';
  for (const character of text) {
    if (chunk.length + character.length > loginTerminalInputLimit) {
      yield chunk;
      chunk = '';
    }
    chunk += character;
  }
  yield* remainingChunk(chunk);
}

const isControlCode = (code: number): boolean =>
  code >= controlOffset && code <= lastControlCode;
function* remainingChunk(chunk: string): Generator<string> {
  if (chunk) yield chunk;
}
