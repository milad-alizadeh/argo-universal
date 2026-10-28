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

type PageOpener = ReturnType<typeof usePluginOpener>;

const noActions: DeclaredHeaderAction[] = [];

// iOS and Android keep every Plugin action in "…"; a desktop and the web give the first one an icon.
export const onPhone = Platform.OS !== 'web';

// The enabled Plugins' Session header actions in Slot order, read from their manifests so none starts to answer (ADR-0025).
export function useDeclaredHeaderActions(): DeclaredHeaderAction[] {
  const trpc = useTRPC();

  const { data = noActions } = useQuery(
    trpc.plugins.declared.queryOptions({ slotId: sessionHeaderSlotId }),
  );

  return data;
}

// What pressing an action does, by its target; opening a page starts the Plugin when it is not running.
const pressOf = (
  open: PageOpener,
  { pluginId, item: { target } }: DeclaredHeaderAction,
): (() => void) => {
  switch (target.type) {
    case 'page': {
      const { path } = target;

      return () => open(pluginId)(path);
    }
    // No default: a new target type leaves this function without a return, which TypeScript rejects.
  }
};

const withPress =
  (open: PageOpener) =>
  (declared: DeclaredHeaderAction): SessionPluginAction => ({
    ...declared,
    onPress: pressOf(open, declared),
  });

// The Session header's Plugin actions, placed for this platform and this Device's switches.
export function usePluginHeaderActions(): SessionPluginActions {
  const open = usePluginOpener();
  const { shows } = useSlotVisibility(sessionHeaderSlotId);

  return placeSessionHeaderActions(
    useDeclaredHeaderActions().map(withPress(open)),
    { phone: onPhone, shows },
  );
}
