import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import { useAfterClose } from '../../hooks/use-after-close';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import { AgentModelMenu } from './agent-model-menu';
import type { ComposerConfigurationProps } from './configuration-types';

type SheetProps = {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
  trigger: React.ComponentProps<typeof Sheet>['trigger'];
};

/*
 * Configure as a sheet whose Model and option rows push their choices as pages. Add Agents leaves for another page, so
 * it waits for the sheet to report closed: a route opened while SwiftUI's sheet is still presented mounts under it
 * and is never shown (#1738).
 */
export function AgentModelSheet(props: SheetProps): React.JSX.Element {
  const [open, setOpen] = useComposerOverlay(props.disabled);
  const after = useAfterClose(setOpen);

  return (
    <Sheet
      open={open}
      onOpenChange={after.onOpenChange}
      onClosed={after.closed}
      {...sheetProps(props)}
    >
      {configurePage(addingAfterClose(props.configuration, after.close))}
    </Sheet>
  );
}

// Add Agents closes the sheet and then runs, as a Composer popover's actions do.
function addingAfterClose(
  configuration: ComposerConfigurationProps,
  close: (after?: () => void) => void,
): ComposerConfigurationProps {
  const { agentChoices } = configuration;

  if (!agentChoices) return configuration;

  return {
    ...configuration,
    agentChoices: { ...agentChoices, onAdd: () => close(agentChoices.onAdd) },
  };
}

// Sheet reads the page declaration from its direct children.
function configurePage(
  configuration: ComposerConfigurationProps,
): React.JSX.Element {
  return (
    <Sheet.Screen name="configure" title="Agent and model">
      <AgentModelMenu configuration={configuration} wide={false} />
    </Sheet.Screen>
  );
}

const sheetProps = (
  props: SheetProps,
): Pick<
  React.ComponentProps<typeof Sheet>,
  'label' | 'trigger' | 'contentScrolls'
> => ({
  label: 'Agent and model',
  trigger: props.trigger,
  contentScrolls: true,
});
