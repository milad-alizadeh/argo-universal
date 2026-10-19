import type { ComponentProps, ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { isFastMode } from './configuration-values';

interface Props {
  name: NonNullable<ComponentProps<typeof Icon>['name']>;
  filled?: boolean;
}

export function ConfigurationRowIcon(props: Props): ReactElement {
  return <Icon {...props} fitArtwork role={{ compact: 'body', wide: 'row' }} />;
}

// Fast mode's row shows the filled lightning, as the trigger does when it is on.
export function optionIcon(
  option: Parameters<typeof isFastMode>[0],
): ReactElement {
  return isFastMode(option) ? (
    <ConfigurationRowIcon name="fast-mode" filled />
  ) : (
    <ConfigurationRowIcon name="filters" />
  );
}
