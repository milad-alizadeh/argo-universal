import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generated, readRules } from './generate-skeleton-rules.mts';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('Skeleton rules', () => {
  it.each([...generated(readRules())])(
    'keeps %s equal to what the JSON generates',
    (path, text) => {
      expect(readFileSync(`${root}${path}`, 'utf8')).toBe(text);
    },
  );
});
