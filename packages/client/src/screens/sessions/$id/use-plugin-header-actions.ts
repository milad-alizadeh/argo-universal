import { sessionHeaderSlotId } from '@repo/contracts/plugins/wire';
import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { useTRPC } from '#features/connection';
import {
  type DeclaredHeaderAction,
  placeSessionHeaderActions,
  type SessionPluginAction,
  type SessionPluginActions,
} from '#features/sessions';
import { useSlotVisibility } from '#features/settings';
import { usePluginOpener } from '../../plugins/use-plugin-opener';

type Opener = ReturnType<typeof usePluginOpener>;

// What pressing an action does, by its target; opening a page starts the Plugin when it is not running.
const pressOf = (
  open: Opener,
  { pluginId, item }: DeclaredHeaderAction,
): (() => void) => {
  switch (item.target.type) {
    case 'page': {
      const { path } = item.target;

      return () => open(pluginId)(path);
    }
  }
};

const withPress =
  (open: Opener) =>
  (declared: DeclaredHeaderAction): SessionPluginAction => ({
    ...declared,
    onPress: pressOf(open, declared),
  });

/*
 * The Session header's Plugin actions, read from the enabled Plugins' manifests so none starts to draw them
 * (ADR-0025), placed for this platform and this Device's switches. iOS and Android keep every one in "…".
 */
export function usePluginHeaderActions(): SessionPluginActions {
  const trpc = useTRPC();
  const open = usePluginOpener();
  const { shows } = useSlotVisibility(sessionHeaderSlotId);

  const { data = [] } = useQuery(
    trpc.plugins.declared.queryOptions({ slotId: sessionHeaderSlotId }),
  );

  return placeSessionHeaderActions(data.map(withPress(open)), {
    phone: Platform.OS !== 'web',
    shows,
  });
}
