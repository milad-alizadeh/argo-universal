import { expect, expectTypeOf, it } from 'vitest';
import type { AgentServer } from '../servers';
import {
  installedAgentSchema,
  type DescribedInstalledAgent,
} from './installed-agent-schema';

// Field by field, so the check compares what each type holds, not how it is composed.
type Fields<Value> = { [Key in keyof Value]: Value[Key] };

it('describes exactly the fields of an Installed Agent', () => {
  expectTypeOf<DescribedInstalledAgent>().toEqualTypeOf<Fields<AgentServer>>();
  expect(Object.keys(installedAgentSchema.properties)).toEqual([
    'id',
    'name',
    'icon',
    'version',
    'env',
  ]);
});
