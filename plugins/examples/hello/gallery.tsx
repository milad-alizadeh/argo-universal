import {
  Image,
  List,
  ListItem,
  Screen,
  Text,
  Svg,
  useState,
  useEffect,
  type Argo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type Picture = NonNullable<PluginProps['Image']['source']>;

type Selection = { selected: string; select: (id: string) => void };

const headingRole = 'heading';

const files = ['Overview', 'Checkout', 'Onboarding', 'Settings', 'Profile'];

const metrics = Array.from({ length: 80 }, (_, index) => ({
  id: String(index),
  title: `Metric ${index + 1}`,
}));

const xml =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><path d="M0 85L30 55L60 70L90 25L120 40L160 10" stroke="currentColor" stroke-width="3" fill="none"/></svg>';

export function helloGallery(assets: Argo['assets']): () => JSX.Element {
  return () => <HelloGallery assets={assets} />;
}

function usePicture(assets: Argo['assets']): Picture | undefined {
  const [picture, setPicture] = useState<Picture>();
  useEffect(() => {
    void assets.resolve({ asset: 'assets/poster.jpeg' }).then((asset) => {
      if (asset.format === 'jpeg') setPicture({ ...asset, format: 'jpeg' });
    });
  }, [assets]);

  return picture;
}

function HelloGallery({ assets }: { assets: Argo['assets'] }): JSX.Element {
  const picture = usePicture(assets);
  const [selected, select] = useState('');

  return (
    <Screen title="Gallery">
      <ThumbnailShelf picture={picture} />
      <MetricsWall selected={selected} select={select} />
    </Screen>
  );
}

const shelfDefaults = {
  direction: 'horizontal',
  tileSize: 'md',
  aspect: 'landscape',
  header: <Text role={headingRole}>Thumbnails</Text>,
  items: files,
} as const;

function ThumbnailShelf({ picture }: { picture?: Picture }): JSX.Element {
  return (
    <List
      {...shelfDefaults}
      renderItem={(title: string) => (
        <ListItem key={title} {...thumbnailProps(title, picture)} />
      )}
    />
  );
}

function thumbnailProps(
  title: string,
  picture?: Picture,
): PluginProps['ListItem'] {
  return {
    title,
    subtitle: 'Screenshot',
    media: <Image source={picture} accessibilityLabel={`${title} preview`} />,
  };
}

const wallDefaults = {
  layout: 'grid',
  columns: 'auto',
  tileSize: 'sm',
  aspect: 'landscape',
  header: <Text role={headingRole}>Metrics</Text>,
  items: metrics,
} as const;

function MetricsWall(props: Selection): JSX.Element {
  return (
    <List
      {...wallDefaults}
      renderItem={(metric: (typeof metrics)[number]) => (
        <ListItem key={metric.id} {...metricProps(metric, props)} />
      )}
    />
  );
}

function metricProps(
  metric: (typeof metrics)[number],
  { selected, select }: Selection,
): PluginProps['ListItem'] {
  return {
    title: metric.title,
    subtitle: 'Latest reading',
    media: <Svg xml={xml} label={`${metric.title} trend`} />,
    selected: metric.id === selected,
    onPress: () => select(metric.id),
  };
}
