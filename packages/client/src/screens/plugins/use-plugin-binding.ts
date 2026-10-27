import type { PluginDispatchInput } from '@repo/contracts/plugins/wire';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { OpenPluginPage } from '../../lib/product/plugin-actions';
import type {
  ContributedView,
  PluginOnEvent,
} from '../../lib/product/plugin-registry';
import { usePluginOpener } from './use-plugin-opener';

export interface PluginBinding {
  onEvent: PluginOnEvent;
  onOpenPage: OpenPluginPage;
}

type Dispatch = (input: PluginDispatchInput) => Promise<void>;

// Binds a drawn view to its Plugin: its events dispatch to that view, and its `navigate` Actions open that Plugin's pages.
export function usePluginBinding(): (drawn: ContributedView) => PluginBinding {
  // The Plugin tree's dispatcher reports a failure once, or the awaiting kit component does.
  const dispatch = useMutation(useTRPC().plugins.dispatch.mutationOptions());
  const opener = usePluginOpener();

  const send: Dispatch = async (input) => {
    await dispatch.mutateAsync(input);
  };

  return (drawn) => ({
    onEvent: viewDispatch(send, drawn),
    onOpenPage: opener(drawn.pluginId),
  });
}

// An event goes to the view and revision its tree was drawn from.
function viewDispatch(
  send: Dispatch,
  { pluginId, path, view: { revision, viewId } }: ContributedView,
): PluginOnEvent {
  return async (key, event) => {
    if (!viewId) throw new Error('Plugin view is not ready');
    await send({ pluginId, path, revision, viewId, key, ...event });
  };
}
