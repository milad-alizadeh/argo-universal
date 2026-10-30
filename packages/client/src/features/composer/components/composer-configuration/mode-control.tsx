import type { SessionConfigSelectOption } from '@repo/contracts';
import { MenuTrigger } from '@repo/kit/primitives/overlays/menu';
import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import { ChipTrigger } from '../composer-status/chip-trigger';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  isDangerous,
  configurationLabel,
  selectedChoice,
  selection,
} from './configuration-values';
import { ModeContents } from './mode-choices';
import { ModeMenu } from './mode-menu';
import type { Mode } from './mode-types';
import { usePendingChoices } from './use-pending-choices';

interface ModeControlProps {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}

/*
 * The pill reads the Mode the Session is in, never a Mode it is only on its way to, so it takes the pending
 * choices for what they say and not for what they would draw: a Mode the Server never takes is said in a
 * toast rather than shown and taken back (#1481).
 */
export function ComposerModeControl(
  props: ModeControlProps,
): React.JSX.Element | null {
  const wide = useContentWide();
  const { choose } = usePendingChoices(props.configuration);
  const configuration = { ...props.configuration, onConfigChange: choose };
  const mode = selection(configuration, 'mode');

  if (!mode) return null;

  return modePresentation({ ...props, configuration, mode, wide });
}

function modePresentation(
  props: ModeControlProps & { mode: Mode; wide: boolean },
): React.JSX.Element {
  if (props.wide && Platform.OS === 'web')
    return (
      <ModeMenu
        configuration={props.configuration}
        mode={props.mode}
        trigger={modeTrigger(props)}
      />
    );

  return <ModeSheet {...props} />;
}

/*
 * The mode's own name, at every width. ACP sends a mode as a value, a name and a description and nothing else, so
 * there is no icon to draw for it: every Agent names its modes itself, and Argo cannot know their shapes
 * (owner, 2026-10-20). Full access reads red. Narrow, the name sits in one of the Composer's own chips.
 */
function modeTrigger(
  props: ModeControlProps & { wide: boolean },
): React.JSX.Element {
  const current = selectedChoice(props.configuration, 'mode');

  const trigger = {
    accessibilityLabel: 'Mode',
    disabled: props.disabled,
    label: modeLabel(current),
    tone: isDangerous(current) ? ('danger' as const) : ('muted' as const),
  };

  if (!props.wide) return <ChipTrigger {...trigger} />;

  return <MenuTrigger {...trigger} />;
}

function modeLabel(current?: SessionConfigSelectOption): string {
  return current ? configurationLabel(current.name) || 'Mode' : 'Mode';
}

type ModeSheetProps = ModeControlProps & { mode: Mode; wide: boolean };

function ModeSheet(props: ModeSheetProps): React.JSX.Element {
  const [open, setOpen] = useComposerOverlay(props.disabled);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      label="Mode"
      trigger={modeTrigger(props)}
      contentScrolls
    >
      {modePage(props, () => setOpen(false))}
    </Sheet>
  );
}

function modePage(
  props: ModeControlProps & { mode: Mode; wide: boolean },
  close: () => void,
): React.JSX.Element {
  return (
    <Sheet.Screen name="mode" title="Mode">
      <ModeContents {...props} close={close} />
    </Sheet.Screen>
  );
}
