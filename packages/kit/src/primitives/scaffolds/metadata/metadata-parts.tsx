import { router } from 'expo-router';
import { isValidElement, type ReactElement } from 'react';
import { Linking } from 'react-native';
import { isLinkUrl } from '#kit/link-url';
import { Avatar } from '#primitives/content/avatar';
import { Icon, type IconProps } from '#primitives/content/icon';
import { Link, isRoute, type LinkProps } from '#primitives/content/link';
import type { PillProps } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { flattenedChildren } from '../../../flattened-children';
import { useMetadataDrawing } from './metadata-drawing-context';
import { MetadataField } from './metadata-field';
import { MetadataPills } from './metadata-pills';
import type {
  MetadataLabelProps,
  MetadataLinkProps,
  MetadataStatusDotProps,
  MetadataAvatarProps,
  MetadataPillsProps,
} from './metadata-props';
import { MetadataText } from './metadata-value';

type FieldOwnProps = Pick<MetadataLabelProps, 'title' | 'accessibilityLabel'>;

// A field's own props; the value it draws comes from its kind.
function fieldProps(props: FieldOwnProps): FieldOwnProps {
  return { title: props.title, accessibilityLabel: props.accessibilityLabel };
}

const iconGlyph = (
  icon: IconProps['name'] | undefined,
): ReactElement | undefined => (icon ? <Icon name={icon} /> : undefined);

export function MetadataLabel(props: MetadataLabelProps): ReactElement {
  const glyph = iconGlyph(props.icon);

  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={props.text}
      face={{ glyph }}
    >
      <MetadataText text={props.text}>{glyph}</MetadataText>
    </MetadataField>
  );
}

// A Metadata link's one `href` is an App route or a URL; the kit Link takes them apart.
function destination(href: string): Pick<LinkProps, 'href' | 'route'> {
  return isRoute(href) ? { route: href } : { href };
}

// As a Pill the whole Pill is the link.
function follow(href: string): () => void {
  return () => {
    if (isRoute(href)) router.navigate(href);
    else if (isLinkUrl(href)) void Linking.openURL(href);
  };
}

export function MetadataLink(props: MetadataLinkProps): ReactElement {
  const glyph = iconGlyph(props.icon);
  const link = <Link label={props.text} {...destination(props.href)} />;

  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={props.text}
      grouped={false}
      face={{ glyph, onPress: follow(props.href) }}
    >
      <MetadataText text={link}>{glyph}</MetadataText>
    </MetadataField>
  );
}

export function MetadataStatus(props: MetadataStatusDotProps): ReactElement {
  const glyph = (
    <StatusDot tone={props.tone} size={useMetadataDrawing().dotSize} />
  );

  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={props.text}
      face={{ glyph, keepsText: true }}
    >
      <MetadataText text={props.text}>{glyph}</MetadataText>
    </MetadataField>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

const avatarGlyph = ({ name, src }: MetadataAvatarProps): ReactElement => (
  <Avatar
    size="sm"
    initials={initials(name)}
    accessibilityLabel={name}
    source={src ? { uri: src } : undefined}
    decorative
  />
);

export function MetadataAvatar(props: MetadataAvatarProps): ReactElement {
  const glyph = avatarGlyph(props);

  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={props.name}
      face={{ glyph }}
    >
      <MetadataText text={props.name}>{glyph}</MetadataText>
    </MetadataField>
  );
}

// The wire lets only Pills in (`children: ['Pill']`), so each child's props are a Pill's values.
function pillProps(children: MetadataPillsProps['children']): PillProps[] {
  return flattenedChildren(children).flatMap((child) =>
    isValidElement<PillProps>(child) ? [child.props] : [],
  );
}

export function MetadataPillsField(props: MetadataPillsProps): ReactElement {
  const pills = pillProps(props.children);

  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={pills.map((pill) => pill.text).join(', ')}
      face={{ glyph: iconGlyph(props.icon), pills }}
    >
      <MetadataPills pills={pills} />
    </MetadataField>
  );
}
