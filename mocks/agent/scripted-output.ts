import type { ScriptedWire } from './scripted-method-player.ts';

export const shareScriptedOutput = (
  output: WritableStream<Uint8Array>,
): {
  stream: WritableStream<Uint8Array>;
  writeRaw: ScriptedWire['writeRaw'];
} => {
  const writer = output.getWriter();
  const encoder = new TextEncoder();
  return {
    stream: new WritableStream({
      write: (chunk) => writer.write(chunk),
      close: () => writer.close(),
      abort: (reason: unknown) => writer.abort(reason),
    }),
    writeRaw: (frame) => writer.write(encoder.encode(`${frame}\n`)),
  };
};
