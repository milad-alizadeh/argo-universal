import type { ComponentProps, ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';

interface Props {
  name: NonNullable<ComponentProps<typeof Icon>['name']>;
}

export function ConfigurationRowIcon(props: Props): ReactElement {
  return <Icon {...props} fitArtwork role={{ compact: 'body', wide: 'row' }} />;
}
