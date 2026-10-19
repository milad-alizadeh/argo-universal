import { isValidElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Pill, type PillProps } from '#primitives/status/pill';
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
import { MetadataRow } from './metadata-row';
import { MetadataText } from './metadata-value';

export function MetadataLabel(props: MetadataLabelProps): ReactElement {
  return (
    <MetadataRow {...props} label={props.text}>
      <MetadataText text={props.text}>
        {props.icon ? <Icon name={props.icon} role="body" /> : null}
      </MetadataText>
    </MetadataRow>
  );
}

export function MetadataLink(props: MetadataLinkProps): ReactElement {
  return (
    <MetadataRow {...props} label={props.text}>
      <MetadataText text={props.text} />
    </MetadataRow>
  );
}

export function MetadataStatus(props: MetadataStatusDotProps): ReactElement {
  return (
    <MetadataRow {...props} label={props.text}>
      <MetadataText text={props.text}>
        <StatusDot
          tone={props.tone}
          size={Platform.OS === 'ios' ? 'md' : 'sm'}
        />
      </MetadataText>
    </MetadataRow>
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
    <MetadataRow {...props} label={props.name}>
      <MetadataText text={props.name}>
        <Avatar
          size="sm"
          initials={initials(props.name)}
          accessibilityLabel={props.name}
          source={props.src ? { uri: props.src } : undefined}
          decorative
        />
      </MetadataText>
    </MetadataRow>
  );
}

function pillProps(children: MetadataPillsProps['children']): PillProps[] {
  return flattenedChildren(children)
    .filter(
      (child): child is ReactElement<PillProps> =>
        isValidElement<PillProps>(child) && child.type === Pill,
    )
    .map((child) => child.props);
}

export function MetadataPillsField(props: MetadataPillsProps): ReactElement {
  const pills = pillProps(props.children);

  return (
    <MetadataRow {...props} label={pills.map((pill) => pill.text).join(', ')}>
      <MetadataPills pills={pills} />
    </MetadataRow>
  );
}
