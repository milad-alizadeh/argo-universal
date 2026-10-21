import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Link } from '#primitives/content/link';
import { Text } from '#primitives/content/text';
import { Variation, Variations as VariationList } from '../../../variations';
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

const examples = [
  webPreview,
  imagePreview,
  issuePreview,
  pullPreview,
  commitPreview,
];

const meta = {
  title: 'Design System/Primitives/Overlays/LinkPreview',
  render: (): ReactElement => <PreviewExamples />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const source = {
  load: async (): Promise<ReactNode> => <LinkPreviewCard data={webPreview} />,
};

function PreviewExamples(): ReactElement {
  if (Platform.OS !== 'web') return <Text>Link previews are web only.</Text>;

  return (
    <VariationList>
      <HoverExamples />
      {examples.map((data) => (
        <CardExample key={exampleLabel(data)} data={data} />
      ))}
    </VariationList>
  );
}

function HoverExamples(): ReactElement {
  return (
    <>
      <Variation label="Hover a link">
        <LinkPreviewContext value={source}>
          <Link href="https://example.com/guide" label="the migration guide" />
        </LinkPreviewContext>
      </Variation>
      <Variation label="No preview">
        <Link href="https://example.com/missing" label="the build log" />
      </Variation>
    </>
  );
}

function CardExample({ data }: { data: LinkPreviewCardData }): ReactElement {
  return (
    <Variation label={exampleLabel(data)}>
      <View className="w-80 overflow-hidden rounded-2xl bg-card shadow-card">
        <LinkPreviewCard data={data} />
      </View>
    </Variation>
  );
}

function exampleLabel(data: LinkPreviewCardData): string {
  return data.kind === 'web' && data.image ? 'web with image' : data.kind;
}

export const Variations: Story = {};
