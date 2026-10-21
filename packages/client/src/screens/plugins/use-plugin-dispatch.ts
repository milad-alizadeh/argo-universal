import type {
  PluginDispatchInput,
  PluginViewId,
} from '@repo/contracts/plugins/wire';
import { errorMessage } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { PluginOnEvent } from '../../lib/product/plugin-registry';

export type PluginDispatch = (input: PluginDispatchInput) => Promise<void>;

export function usePluginDispatch(): PluginDispatch {
  const dispatch = useMutation({
    ...useTRPC().plugins.dispatch.mutationOptions(),
    onError: (error) =>
      showToast({
        title: 'Plugin action failed',
        message: errorMessage(error),
        tone: 'danger',
      }),
  });

  return async (input) => {
    await dispatch.mutateAsync(input);
  };
}

type DispatchTarget = Pick<
  PluginDispatchInput,
  'pluginId' | 'path' | 'revision'
> & { viewId: PluginViewId | null };

export function bindPluginDispatch(
  send: PluginDispatch,
  target: DispatchTarget,
): PluginOnEvent {
  return async (key, interaction) => {
    if (!target.viewId) throw new Error('Plugin view is not ready');
    await send({ ...target, viewId: target.viewId, key, ...interaction });
  };
}
