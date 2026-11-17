import { expect, it } from 'vitest';
import { buildsWithDefaults } from './runtime-setup';

it('watches by default, and when the setting is given as undefined', () => {
  expect(buildsWithDefaults({}).watch).toBe(true);
  expect(buildsWithDefaults({ watch: undefined }).watch).toBe(true);
  expect(buildsWithDefaults({ watch: false }).watch).toBe(false);
});
