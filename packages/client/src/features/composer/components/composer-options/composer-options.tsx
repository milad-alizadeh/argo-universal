import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Button } from '#primitives/buttons/button/button';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';
import { ComposerPopover } from '../composer-popover/composer-popover';

type Option = SessionConfigOption;
import { OptionsContents } from './options-contents';
function optionsFor(configuration: ComposerConfigurationProps): Option[] {
  return configuration.configOptions.filter(
    (option) =>
      option.type === 'boolean' ||
      !['mode', 'model', 'thought_level'].includes(option.category ?? ''),
  );
}

interface OptionsProps {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}
export function ComposerOptions({
  configuration,
  disabled,
}: OptionsProps): React.JSX.Element | null {
  const options = optionsFor(configuration);
  if (!options.length) return null;
  return (
    <OptionsPopover
      options={options}
      configuration={configuration}
      disabled={disabled}
    />
  );
}
function OptionsPopover({
  options,
  configuration,
  disabled,
}: OptionsProps & { options: Option[] }): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Session settings"
      trigger={OptionsTrigger({ disabled })}
    >
      {() => <OptionsContents {...contentsProps(options, configuration)} />}
    </ComposerPopover>
  );
}
function OptionsTrigger({
  disabled,
}: Pick<OptionsProps, 'disabled'>): React.JSX.Element {
  return (
    <Button
      {...optionsButtonAppearance}
      disabled={disabled}
      accessibilityLabel="Session settings"
      label="Settings"
      className="h-7 sm:h-7 px-1.5 py-0"
      labelClassName="text-muted-foreground"
    />
  );
}
function contentsProps(
  options: Option[],
  configuration: ComposerConfigurationProps,
): React.ComponentProps<typeof OptionsContents> {
  return { options, onChange: configuration.onConfigChange };
}

const optionsButtonAppearance = {
  appearance: 'content',
  size: 'xs',
  variant: 'ghost',
} as const;
