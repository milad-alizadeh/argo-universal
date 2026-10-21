import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Link } from '#primitives/content/link';
import { Text } from '#primitives/content/text';
import { LinkPreviewCard } from './link-preview-card';
import type { LinkPreviewCardData } from './link-preview-card-props';
import { LinkPreviewContext } from './link-preview-context';
import {
  commitPreview,
  issuePreview,
  pullPreview,
  webPreview,
} from './link-preview.mocks';

const imagePreview: LinkPreviewCardData = {
  ...webPreview,
  image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="168"><rect width="320" height="168" fill="#e5e5e5"/></svg>')}`,
};

const source = {
  load: async (): Promise<ReactNode> => <LinkPreviewCard data={webPreview} />,
};

/*
 * LinkPreviewCard declares one prop, `data`, an opaque preview the Server adapter resolves; the kind
 * it carries is the branch, so each kind is its own story. The card draws in the floating surface the
 * overlay raises it in.
 */
const meta = {
  title: 'Design System/Primitives/Overlays/LinkPreview',
  component: LinkPreviewCard,
  args: { data: webPreview },
  argTypes: { data: { control: false } },
  render: (args): ReactElement => (
    <WebOnly>
      <View className="w-80 overflow-hidden rounded-2xl bg-card shadow-card">
        <LinkPreviewCard {...args} />
      </View>
    </WebOnly>
  ),
} satisfies Meta<typeof LinkPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// The hover itself, which the overlay owns: the card arrives from the App's source.
export const Hover: Story = {
  render: (): ReactElement => (
    <WebOnly>
      <LinkPreviewContext value={source}>
        <Link href="https://example.com/guide" label="the migration guide" />
      </LinkPreviewContext>
    </WebOnly>
  ),
};

export const NoPreview: Story = {
  parameters: {
    docs: {
      description: { story: 'A link with no source hovers as a plain link.' },
    },
  },
  render: (): ReactElement => (
    <WebOnly>
      <Link href="https://example.com/missing" label="the build log" />
    </WebOnly>
  ),
};

export const Web: Story = {};

export const WebWithImage: Story = { args: { data: imagePreview } };

export const Issue: Story = { args: { data: issuePreview } };

export const PullRequest: Story = { args: { data: pullPreview } };

export const Commit: Story = { args: { data: commitPreview } };

function WebOnly({ children }: { children: ReactNode }): ReactNode {
  if (Platform.OS !== 'web') return <Text>Link previews are web only.</Text>;

  return children;
}
