import { serviceMapXml } from '#kit/primitives/visual/svg-fixtures';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Pill } from '#primitives/status/pill';
import { Svg } from '#primitives/visual';
import type { CardProps } from './card-props';

export const titleOnlyCard = { title: 'api-gateway' } satisfies CardProps;

// The unrelated example from the Paper master: a deploy status card.
export const anatomyCard = {
  title: 'api-gateway',
  subtitle: 'Production',
  actions: <IconButton icon="more" variant="ghost" accessibilityLabel="More" />,
  children: (
    <Stack direction="column" gap={2} align="start">
      <Text>Deployed 12 min ago by Ana Ruiz</Text>
      <Pill tone="success" text="Healthy" />
    </Stack>
  ),
} satisfies CardProps;

export const mediaCard = {
  media: <Svg xml={serviceMapXml} label="Service map" />,
  title: 'Service map',
  subtitle: '12 services',
  children: <Text>Updated after the last deploy.</Text>,
} satisfies CardProps;
