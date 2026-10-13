import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { Icon } from '../../../../lib/generic/symbols/icon';
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
const destructiveTextClassName = 'text-destructive';
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
function modeTrigger(
  props: ModeControlProps & { wide: boolean },
): React.JSX.Element {
  const wide = props.wide;
  const current = selectedChoice(props.configuration, 'mode');
  return <Button {...modeButtonProps(props, current, wide)} />;
}
const modeButtonAppearance = {
  appearance: 'content',
  variant: 'ghost',
  accessibilityLabel: 'Mode',
} as const;
function modeButtonProps(
  props: ModeControlProps,
  current: SessionConfigSelectOption | undefined,
  wide: boolean,
): React.ComponentProps<typeof Button> {
  return {
    ...modeButtonAppearance,
    disabled: props.disabled,
    label: visibleModeLabel(current, wide),
    icon: modeIcon(current),
    className: cn('h-7 sm:h-7 py-0 gap-1.5', wide ? 'px-1.5' : 'w-7 p-0'),
    labelClassName: modeLabelClassName(current, wide),
    trailing: wide ? <ModeChevron /> : undefined,
  };
}
function modeLabel(current?: SessionConfigSelectOption): string {
  return current ? configurationLabel(current.name) || 'Mode' : 'Mode';
}
function modeLabelClassName(
  current: SessionConfigSelectOption | undefined,
  wide: boolean,
): string {
  return cn(
    'text-muted-foreground',
    !wide && 'hidden',
    isDangerous(current) && destructiveTextClassName,
  );
}
function ModeChevron(): React.JSX.Element {
  return (
    <Icon
      role="control"
      name="chevron-down"
      className="text-muted-foreground"
    />
  );
}

function modeIcon(
  current?: SessionConfigSelectOption,
): ReturnType<typeof configurationIcon> {
  return configurationIcon(current ? choiceMetadata(current)?.icon : undefined);
}

function visibleModeLabel(
  current: SessionConfigSelectOption | undefined,
  wide: boolean,
): string {
  return wide ? modeLabel(current) : '';
}
