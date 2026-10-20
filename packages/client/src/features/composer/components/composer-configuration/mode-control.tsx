import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { useComposerOverlay } from '../../hooks/use-composer-overlay';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  isDangerous,
  configurationLabel,
  selectedChoice,
  selection,
} from './configuration-values';
import { ModeContents } from './mode-choices';
import type { Mode } from './mode-types';

interface ModeControlProps {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}

export function ComposerModeControl(
  props: ModeControlProps,
): React.JSX.Element | null {
  const wide = useContentWide();
  const mode = selection(props.configuration, 'mode');

  if (!mode) return null;

  return <ModePopover {...props} mode={mode} wide={wide} />;
}

function ModePopover(
  props: ModeControlProps & { mode: Mode; wide: boolean },
): React.JSX.Element {
  if (!props.wide || Platform.OS !== 'web') return <ModeSheet {...props} />;

  return (
    <ComposerPopover listContent label="Mode" trigger={modeTrigger(props)}>
      {(close) => <ModeContents {...props} close={close} />}
    </ComposerPopover>
  );
}

// Paper's Composer pickers: control text and radius-md corners.
const modeTriggerAppearance = {
  accessibilityLabel: 'Mode',
  labelRole: { compact: 'row', wide: 'control' },
} as const;

/*
 * The mode's own name, at every width. ACP sends a mode as a value, a name and a description and nothing else, so
 * there is no icon to draw for it: every Agent names its modes itself, and Argo cannot know their shapes
 * (owner, 2026-10-20). Full access reads red.
 */
function modeTrigger(props: ModeControlProps): React.JSX.Element {
  const current = selectedChoice(props.configuration, 'mode');

  return (
    <MenuTrigger
      {...modeTriggerAppearance}
      disabled={props.disabled}
      label={modeLabel(current)}
      tone={isDangerous(current) ? 'danger' : 'muted'}
    />
  );
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
    <Sheet.Page name="mode" title="Mode">
      <ModeContents {...props} close={close} />
    </Sheet.Page>
  );
}
