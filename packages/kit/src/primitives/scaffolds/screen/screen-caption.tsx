import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { Icon } from '#primitives/content/icon';
import { Link, isRoute } from '#primitives/content/link';
import { Text } from '#primitives/content/text';
import type { ScreenProps } from './screen-props';

// A wide page's caption; a phone leaves it out, as its native header has no room for it.
export function ScreenCaption({
  caption,
  captionHref,
}: Pick<ScreenProps, 'caption' | 'captionHref'>): ReactNode {
  const wide = useWide();

  if (!caption || !wide) return null;

  return <Caption caption={caption} href={captionHref} />;
}

function Caption(props: { caption: string; href?: string }): ReactNode {
  if (!props.href) return <CaptionText caption={props.caption} />;

  return <CaptionLink caption={props.caption} href={props.href} />;
}

function CaptionText({ caption }: { caption: string }): ReactNode {
  return (
    <Text role="body" tone="muted">
      {caption}
    </Text>
  );
}

// A caption that goes somewhere says so with a link glyph after it, as the page's one link out.
function CaptionLink(props: { caption: string; href: string }): ReactNode {
  return (
    <View className="flex-row items-center gap-1">
      <Text role="body" tone="muted">
        <Link label={props.caption} {...captionTarget(props.href)} />
      </Text>
      <Icon name="external-link" size="sm" tone="muted" />
    </View>
  );
}

// One `href` is an App route or a URL, as a Link's is; the kit Link takes them apart.
const captionTarget = (href: string): { href: string } | { route: string } =>
  isRoute(href) ? { route: href } : { href };
