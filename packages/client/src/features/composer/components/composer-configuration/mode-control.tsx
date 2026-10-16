import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { MenuTrigger } from '#primitives/overlays/menu';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  configurationIcon,
  choiceMetadata,
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
  return (
    <ComposerPopover listContent label="Mode" trigger={modeTrigger(props)}>
      {(close) => <ModeContents {...props} close={close} />}
    </ComposerPopover>
  );
}

// Wide, the icon, label and chevron; narrow, the icon alone. Full access reads red.
function modeTrigger(
  props: ModeControlProps & { wide: boolean },
): React.JSX.Element {
  const current = selectedChoice(props.configuration, 'mode');

  return (
    <MenuTrigger
      accessibilityLabel="Mode"
      disabled={props.disabled}
      label={modeLabel(current)}
      icon={modeIcon(current)}
      tone={isDangerous(current) ? 'danger' : 'muted'}
      iconOnly={!props.wide}
    />
  );
}

function modeLabel(current?: SessionConfigSelectOption): string {
  return current ? configurationLabel(current.name) || 'Mode' : 'Mode';
}

function modeIcon(
  current?: SessionConfigSelectOption,
): ReturnType<typeof configurationIcon> {
  return configurationIcon(current ? choiceMetadata(current)?.icon : undefined);
}
