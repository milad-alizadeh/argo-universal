import type { ShellOutput } from '@repo/contracts';

export async function collectShellOutput(
  output: AsyncIterable<ShellOutput>,
): Promise<ShellOutput[]> {
  const chunks: ShellOutput[] = [];

  for await (const chunk of output) chunks.push(chunk);

  return chunks;
}

export async function readShellOutputUntil(
  output: AsyncIterable<ShellOutput>,
  expected: string,
): Promise<ShellOutput> {
  let text = '';

  for await (const chunk of output) {
    text += chunk.text;

    if (text === expected) return { ...chunk, text };
  }

  throw new Error('Shell ended before its expected output');
}
