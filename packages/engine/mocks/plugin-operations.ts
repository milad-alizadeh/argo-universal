import { startEngineTestHost } from './engine';
import { operationCaller } from './operations';
import { settingsProbe } from './plugin-settings';
import { createRuntimePlugins } from './runtime-plugins';

export async function startPluginOperations(): Promise<
  Awaited<ReturnType<typeof operationCaller>>
> {
  const home = await createRuntimePlugins([settingsProbe]);

  return operationCaller(await startEngineTestHost({ home }));
}
