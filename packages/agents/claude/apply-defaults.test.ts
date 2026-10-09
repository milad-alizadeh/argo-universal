import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { expect, it, vi } from 'vitest';
import { applyValues } from './apply-values';
import { startingValues } from './config-options';
import { models } from './mocks/config-models';
function configPort(): Pick<
  Query,
  'setModel' | 'setPermissionMode' | 'applyFlagSettings'
> {
  return {
    setModel: vi.fn<Query['setModel']>(),
    setPermissionMode: vi.fn<Query['setPermissionMode']>(),
    applyFlagSettings: vi.fn<Query['applyFlagSettings']>(),
  };
}
it('leaves provider settings untouched when no selection is saved', async (): Promise<void> => {
  const port = configPort();
  await applyValues(
    port,
    startingValues(models, []),
    startingValues(models, []),
  );
  expect(port.setModel).not.toHaveBeenCalled();
  expect(port.setPermissionMode).not.toHaveBeenCalled();
  expect(port.applyFlagSettings).not.toHaveBeenCalled();
});
it('applies an explicit supported effort', async (): Promise<void> => {
  const port = configPort();
  const defaults = startingValues(models, []);
  const explicit = startingValues(models, [
    { configId: 'effort', value: 'high' },
  ]);
  await applyValues(port, defaults, explicit);
  expect(port.applyFlagSettings).toHaveBeenCalledExactlyOnceWith({
    effortLevel: 'high',
  });
  expect(port.setModel).not.toHaveBeenCalled();
});
it('resets explicit effort through the SDK', async (): Promise<void> => {
  const port = configPort();
  const defaults = startingValues(models, []);
  const explicit = startingValues(models, [
    { configId: 'effort', value: 'high' },
  ]);
  await applyValues(port, explicit, defaults);
  expect(port.applyFlagSettings).toHaveBeenCalledExactlyOnceWith({
    effortLevel: null,
  });
  expect(port.setModel).not.toHaveBeenCalled();
});
