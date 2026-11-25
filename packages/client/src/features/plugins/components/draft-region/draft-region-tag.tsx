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

// The resting and the active tag share one box and left padding, so the label stays put when a tag wakes; only the chevrons add width.
const tagBox = 'min-h-5.5 flex-row items-center rounded-md border pl-1.5';

const summary = ({ label, letter, position, count }: Tag): string =>
  `${label} · ${letter} ${position}/${count}`;

export function DraftRegionTag(props: DraftRegionTagProps): React.JSX.Element {
  const { tag, active } = props;

  if (!active) return <RestingTag {...props} />;

  return (
    <View
      role="group"
      aria-label={`${tag.label} Variant`}
      className={`${tagBox} gap-0.5 border-border bg-card pr-1 shadow-control`}
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
      className={`${tagBox} border-hairline bg-content pr-1.5`}
    >
      <Text role="badge" dimmed>
        {summary(tag)}
      </Text>
    </Pressable>
  );
}

// A 16 chevron with 14 on each side is a 44 touch area.
const stepSlop = 14;

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
      hitSlop={stepSlop}
    >
      <Icon name={props.icon} size="sm" tone="muted" />
    </Pressable>
  );
}
