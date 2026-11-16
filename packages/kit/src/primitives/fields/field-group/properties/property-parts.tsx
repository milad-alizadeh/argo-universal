import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Linking } from 'react-native';
import { isLinkUrl } from '#kit/link-url';
import { Avatar } from '#primitives/content/avatar';
import { Icon, type IconProps } from '#primitives/content/icon';
import { Link, isRoute } from '#primitives/content/link';
import { StatusDot } from '#primitives/status/status-dot';
import { usePropertiesDrawing } from './properties-place';
import { PropertyField } from './property-field';
import type {
  PropertyAvatarProps,
  PropertyLabelProps,
  PropertyLinkProps,
  PropertyOwnProps,
  PropertyPillsProps,
  PropertyStatusProps,
} from './property-parts-props';
import { PropertyPills } from './property-pills';
import { PropertyText } from './property-text';

// A field's own props; the value it draws comes from its kind.
function fieldProps(props: PropertyOwnProps): PropertyOwnProps {
  return { title: props.title, accessibilityLabel: props.accessibilityLabel };
}

const iconGlyph = (
  icon: IconProps['name'] | undefined,
): ReactElement | undefined => (icon ? <Icon name={icon} /> : undefined);

export function PropertyLabel(props: PropertyLabelProps): ReactElement {
  const glyph = iconGlyph(props.icon);

  return (
    <PropertyField
      {...fieldProps(props)}
      valueLabel={props.text}
      face={{ glyph }}
    >
      <PropertyText text={props.text}>{glyph}</PropertyText>
    </PropertyField>
  );
}

// As a Pill the whole Pill is the link: an App route, or a URL the kit Link would open.
function follow({ href, route }: PropertyLinkProps['link']): () => void {
  return () => {
    if (isRoute(route)) router.navigate(route);
    else openUrl(href);
  };
}

function openUrl(href: string | undefined): void {
  if (href !== undefined && isLinkUrl(href)) void Linking.openURL(href);
}

export function PropertyLink(props: PropertyLinkProps): ReactElement {
  const glyph = iconGlyph(props.icon);

  return (
    <PropertyField
      {...fieldProps(props)}
      valueLabel={props.link.label}
      grouped={false}
      face={{ glyph, onPress: follow(props.link) }}
    >
      <PropertyText text={<Link {...props.link} />}>{glyph}</PropertyText>
    </PropertyField>
  );
}

export function PropertyStatus(props: PropertyStatusProps): ReactElement {
  const glyph = (
    <StatusDot tone={props.tone} size={usePropertiesDrawing().dotSize} />
  );

  return (
    <PropertyField
      {...fieldProps(props)}
      valueLabel={props.text}
      face={{ glyph, keepsText: true }}
    >
      <PropertyText text={props.text}>{glyph}</PropertyText>
    </PropertyField>
  );
}

// The name an Avatar says: its own, else what it is announced as.
const nameOf = ({ avatar }: PropertyAvatarProps): string =>
  avatar.name ?? avatar.accessibilityLabel;

export function PropertyAvatar(props: PropertyAvatarProps): ReactElement {
  const glyph = <Avatar {...props.avatar} size="sm" decorative />;

  return (
    <PropertyField
      {...fieldProps(props)}
      valueLabel={nameOf(props)}
      face={{ glyph }}
    >
      <PropertyText text={nameOf(props)}>{glyph}</PropertyText>
    </PropertyField>
  );
}

export function PropertyPillsField(props: PropertyPillsProps): ReactElement {
  return (
    <PropertyField
      {...fieldProps(props)}
      valueLabel={props.pills.map((pill) => pill.text).join(', ')}
      face={{ glyph: iconGlyph(props.icon), pills: props.pills }}
    >
      <PropertyPills pills={props.pills} />
    </PropertyField>
  );
}
