import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import type { DraftRegionTag as Tag } from '../../utils/draft-regions-model';

export interface DraftRegionTagProps {
  tag: Tag;
  active: boolean;
  // A touch has no hover, so pressing a resting tag makes its region the active one.
  onActivate: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const summary = ({ label, letter, position, count }: Tag): string =>
  `${label} · ${letter} ${position}/${count}`;

export function DraftRegionTag(props: DraftRegionTagProps): React.JSX.Element {
  const { tag, active } = props;

  if (!active) return <RestingTag {...props} />;

  return (
    <View
      role="group"
      aria-label={`${tag.label} Variant`}
      className="flex-row items-center gap-0.5 rounded-md border border-border bg-card py-0.5 pl-2 pr-1 shadow-control"
    >
      <Text role="badge">{summary(tag)}</Text>
      <StepButton
        label={`Previous ${tag.label} Variant`}
        icon="chevron-left"
        onPress={props.onPrevious}
      />
      <StepButton
        label={`Next ${tag.label} Variant`}
        icon="chevron-right"
        onPress={props.onNext}
      />
    </View>
  );
}

function RestingTag({
  tag,
  onActivate,
}: DraftRegionTagProps): React.JSX.Element {
  return (
    <Pressable
      role="group"
      aria-label={`${tag.label} Variant`}
      onPress={onActivate}
      className="rounded-md border border-hairline bg-content px-1.5"
    >
      <Text role="badge" dimmed>
        {summary(tag)}
      </Text>
    </Pressable>
  );
}

function StepButton(props: {
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      role="button"
      aria-label={props.label}
      onPress={props.onPress}
      hitSlop={6}
    >
      <Icon name={props.icon} size="sm" tone="muted" />
    </Pressable>
  );
}
