import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Pill } from '#primitives/status/pill';
import { Svg } from '#primitives/visual';
import { serviceMapXml } from '../../../../mocks/service-map-svg';
import type { CardProps } from './card-props';

const title = 'api-gateway';

export const titleOnlyCard = { title } satisfies CardProps;

// The unrelated example from the Paper master: a deploy status card.
export const anatomyCard = {
  title,
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

const releaseNotes = (
  <Stack direction="column" gap={2} align="start">
    <Text>Deployed 12 min ago by Ana Ruiz</Text>
    <Text>Rolled back 2 hours ago by Sam Lee</Text>
  </Stack>
);

// Folded: the title and its chevron stay; the body and footer are away.
export const collapsedCard = {
  title,
  kind: 'glass',
  collapsible: true,
  defaultOpen: false,
  children: releaseNotes,
} satisfies CardProps;

export const expandedCard = {
  ...collapsedCard,
  defaultOpen: true,
} satisfies CardProps;

// The footer folds with the body and sits under it.
export const footerCard = {
  ...expandedCard,
  footer: <Text tone="muted">3 earlier deploys</Text>,
} satisfies CardProps;
