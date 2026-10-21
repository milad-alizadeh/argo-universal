import type { ReactElement } from 'react';
import { Image, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type {
  LinkPreviewCardData,
  WebPreview,
} from './link-preview-card-props';
import { PreviewSecondary } from './link-preview-card-text';
import { GitCard } from './link-preview-git';

export function LinkPreviewCard({
  data,
}: {
  data: LinkPreviewCardData;
}): ReactElement {
  return data.kind === 'web' ? (
    <WebCard data={data} />
  ) : (
    <GitCard data={data} />
  );
}

function WebCard({ data }: { data: WebPreview }): ReactElement {
  return (
    <View>
      <WebImage image={data.image} />
      <View className="gap-1 p-3">
        <Text role="body" className="font-semibold" numberOfLines={2}>
          {data.title}
        </Text>
        <WebDomain data={data} />
      </View>
    </View>
  );
}

function WebImage({ image }: { image?: string }): ReactElement | null {
  return image ? (
    <Image source={{ uri: image }} className="h-42 w-full" resizeMode="cover" />
  ) : null;
}

function WebDomain({ data }: { data: WebPreview }): ReactElement {
  return (
    <View className="flex-row items-center gap-1.5">
      <SiteIcon icon={data.icon} />
      <PreviewSecondary>{data.domain}</PreviewSecondary>
    </View>
  );
}

function SiteIcon({ icon }: { icon?: string }): ReactElement {
  return icon ? (
    <Image source={{ uri: icon }} className="size-3.5" />
  ) : (
    <Icon name="web" role="mark" tone="muted" />
  );
}
