import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import type { DraftRegionTag as Tag } from '../../utils/draft-regions-model';

export interface DraftRegionTagProps {
  tag: Tag;
  // The region the pointer is on, or the one last touched: its tag shows the controls; every other tag rests, muted.
  active: boolean;
  // A touch has no hover, so pressing a resting tag makes its region the active one.
  onActivate: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

// "Header · B 2/3": the region, the Variant's letter, and its place among the region's Variants.
const summary = ({ label, letter, position, count }: Tag): string =>
  `${label} · ${letter} ${position}/${count}`;

// A small tag on a region's top edge. Resting it is quiet; on the active region it says the same in full and steps the Variant.
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
