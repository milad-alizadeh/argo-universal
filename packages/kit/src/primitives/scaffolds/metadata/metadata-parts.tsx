import { isValidElement, type ReactElement } from 'react';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Link, isRoute, type LinkProps } from '#primitives/content/link';
import type { PillProps } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { flattenedChildren } from '../../../flattened-children';
import { useWide } from '../../../use-wide/use-wide';
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

export function MetadataLabel(props: MetadataLabelProps): ReactElement {
  return (
    <MetadataField {...fieldProps(props)} valueLabel={props.text}>
      <MetadataText text={props.text}>
        {props.icon ? <Icon name={props.icon} /> : null}
      </MetadataText>
    </MetadataField>
  );
}

// A Metadata link's one `href` is an App route or a URL; the kit Link takes them apart.
function destination(href: string): Pick<LinkProps, 'href' | 'route'> {
  return isRoute(href) ? { route: href } : { href };
}

/*
 * A link the page already carries elsewhere — a Screen's linked caption — is drawn only where the page does not carry
 * it: the caption shows on a wide window alone, so a narrower one keeps the field whatever root it draws.
 */
export function MetadataLink(props: MetadataLinkProps): ReactElement | null {
  const wide = useWide();

  if (props.whenNarrow && wide) return null;

  return <LinkField {...props} />;
}

function LinkField(props: MetadataLinkProps): ReactElement {
  return (
    <MetadataField
      {...fieldProps(props)}
      valueLabel={props.text}
      grouped={false}
    >
      <MetadataText
        text={<Link label={props.text} {...destination(props.href)} />}
      />
    </MetadataField>
  );
}

export function MetadataStatus(props: MetadataStatusDotProps): ReactElement {
  const { dotSize } = useMetadataDrawing();

  return (
    <MetadataField {...fieldProps(props)} valueLabel={props.text}>
      <MetadataText text={props.text}>
        <StatusDot tone={props.tone} size={dotSize} />
      </MetadataText>
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

export function MetadataAvatar(props: MetadataAvatarProps): ReactElement {
  return (
    <MetadataField {...fieldProps(props)} valueLabel={props.name}>
      <MetadataText text={props.name}>
        <Avatar
          size="sm"
          initials={initials(props.name)}
          accessibilityLabel={props.name}
          source={props.src ? { uri: props.src } : undefined}
          decorative
        />
      </MetadataText>
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
    >
      <MetadataPills pills={pills} />
    </MetadataField>
  );
}
