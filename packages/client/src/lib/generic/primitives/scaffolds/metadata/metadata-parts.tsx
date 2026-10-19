import { isValidElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { ListItem } from '#primitives/lists/list-item';
import type { PillProps } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { flattenedChildren } from '../../../flattened-children';
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
    <ListItem.Field {...fieldProps(props)} valueLabel={props.text}>
      <MetadataText text={props.text}>
        {props.icon ? <Icon name={props.icon} role="body" /> : null}
      </MetadataText>
    </ListItem.Field>
  );
}

export function MetadataLink(props: MetadataLinkProps): ReactElement {
  return (
    <ListItem.Field {...fieldProps(props)} valueLabel={props.text}>
      <MetadataText text={props.text} />
    </ListItem.Field>
  );
}

export function MetadataStatus(props: MetadataStatusDotProps): ReactElement {
  return (
    <ListItem.Field {...fieldProps(props)} valueLabel={props.text}>
      <MetadataText text={props.text}>
        <StatusDot
          tone={props.tone}
          size={Platform.OS === 'ios' ? 'md' : 'sm'}
        />
      </MetadataText>
    </ListItem.Field>
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
    <ListItem.Field {...fieldProps(props)} valueLabel={props.name}>
      <MetadataText text={props.name}>
        <Avatar
          size="sm"
          initials={initials(props.name)}
          accessibilityLabel={props.name}
          source={props.src ? { uri: props.src } : undefined}
          decorative
        />
      </MetadataText>
    </ListItem.Field>
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
    <ListItem.Field
      {...fieldProps(props)}
      valueLabel={pills.map((pill) => pill.text).join(', ')}
    >
      <MetadataPills pills={pills} />
    </ListItem.Field>
  );
}
