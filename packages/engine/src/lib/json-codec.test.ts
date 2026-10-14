import { expect, it } from 'vitest';
import { z } from 'zod';
import { jsonCodec } from './json-codec';

const Record = jsonCodec(z.strictObject({ pid: z.number() }));

it('decodes JSON text that matches the schema', () => {
  expect(Record.parse('{"pid":7}')).toEqual({ pid: 7 });
});

it.each([
  { label: 'malformed JSON', text: '{broken', code: 'invalid_format' },
  {
    label: 'JSON of the wrong shape',
    text: '{"pid":"7"}',
    code: 'invalid_type',
  },
])('reports $label as an issue instead of throwing', ({ text, code }) => {
  const result = Record.safeParse(text);

  expect(result.success).toBe(false);
  expect(result.error?.issues).toMatchObject([{ code }]);
});
