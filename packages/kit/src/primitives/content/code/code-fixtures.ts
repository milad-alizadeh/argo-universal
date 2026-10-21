import type { CodeProps } from './code-props';

const sample =
  "// Responses must never be cached\nexport function noStore(res: Response) {\n  res.headers.set(CACHE, 'no-store');\n  return res;\n}";

const longSample = Array.from(
  { length: 30 },
  (_, index) =>
    `Line ${index + 1}: a long line of text that scrolls horizontally across the block.`,
).join('\n');

export const pathAndSyntaxCode = {
  code: sample,
  language: 'ts',
  path: 'src/http/middleware/no-store.ts',
} satisfies CodeProps;

export const noPathCode = {
  code: 'echo ready',
  language: 'sh',
} satisfies CodeProps;

export const noLanguageCode = { code: 'plain text' } satisfies CodeProps;

export const diffCode = {
  path: 'example.ts',
  diff: [
    {
      header: '@@ -1 +1 @@',
      lines: [
        { kind: 'removed', number: 1, text: 'const value = 1;' },
        { kind: 'added', number: 1, text: 'const value = 2;' },
      ],
    },
  ],
} satisfies CodeProps;

export const longCode = { code: longSample } satisfies CodeProps;
