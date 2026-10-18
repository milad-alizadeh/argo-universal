import { expect, it } from 'vitest';
import { PluginSlotInput, projectDetailsSlotId } from './wire';

it('takes the context its Slot id names', () => {
  expect(
    PluginSlotInput.parse({
      slotId: projectDetailsSlotId,
      context: { projectId: 'argo' },
    }),
  ).toEqual({ slotId: projectDetailsSlotId, context: { projectId: 'argo' } });
});

it.each([
  {
    name: 'an unknown Slot id',
    input: { slotId: 'argo/nowhere/v1', context: { projectId: 'argo' } },
  },
  {
    name: 'a context key the Slot does not take',
    input: {
      slotId: projectDetailsSlotId,
      context: { projectId: 'argo', path: '/' },
    },
  },
  {
    name: 'an empty Project id',
    input: { slotId: projectDetailsSlotId, context: { projectId: '' } },
  },
])('refuses $name', ({ input }) => {
  expect(PluginSlotInput.safeParse(input).success).toBe(false);
});
