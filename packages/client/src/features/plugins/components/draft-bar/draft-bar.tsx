import {
  draftStateIds,
  type DraftStateId,
} from '@repo/contracts/plugins/drafts';
import { Text } from '@repo/kit/primitives/content/text';
import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { Menu, MenuTrigger } from '@repo/kit/primitives/overlays/menu';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import type { DraftBarState } from '../../utils/draft-bar-model';

export interface DraftBarProps {
  states: readonly DraftBarState[];
  current: DraftStateId;
  form?: 'tabs' | 'menu';
  onStateChange: (state: DraftStateId) => void;
  commentToggle?: React.ReactNode;
  choose?: React.ReactNode;
}

const stateLabel = 'State';

// The menu has no place for a note beside a row, so a state the Draft does not draw says so in its label.
const missingNote = 'missing';

// The bar over a dev Plugin's Draft page: the Draft badge, the states, then a slot each for the comment toggle and Choose. App chrome, drawn apart from the page's own tree so it never reads as the Plugin's design.
export function DraftBar(props: DraftBarProps): React.JSX.Element {
  const { commentToggle, choose } = props;

  return (
    <View
      role="toolbar"
      aria-label="Draft"
      className="flex-row items-center gap-2 rounded-xl border border-hairline bg-tray p-1.5 shadow-raised"
    >
      <DraftBadge />
      <States {...props} />
      {commentToggle}
      {choose}
    </View>
  );
}

function DraftBadge(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5 rounded-lg bg-warning/18 px-2.5 py-1">
      <StatusDot tone="warning" size="sm" />
      <Text role="badge" tone="neutral">
        Draft
      </Text>
    </View>
  );
}

function States(props: DraftBarProps): React.JSX.Element {
  if (props.form === 'tabs') return <StateTabs {...props} />;

  if (props.form === 'menu') return <StateMenu {...props} />;

  return (
    <SizeClass
      compact={<StateMenu {...props} />}
      wide={<StateTabs {...props} />}
    />
  );
}

function StateTabs({
  states,
  current,
  onStateChange,
}: DraftBarProps): React.JSX.Element {
  return (
    <SegmentedControl
      label={stateLabel}
      options={states
        .filter(({ missing }) => !missing)
        .map(({ id, label }) => ({ value: id, label }))}
      value={current}
      onValueChange={(value) => onStateChange(stateOf(value))}
    />
  );
}

function StateMenu({
  states,
  current,
  onStateChange,
}: DraftBarProps): React.JSX.Element {
  const label = states.find(({ id }) => id === current)?.label ?? '';

  return (
    <Menu
      accessibilityLabel={stateLabel}
      value={current}
      options={states.map(({ id, label: name, missing }) => ({
        value: id,
        label: missing ? `${name} · ${missingNote}` : name,
        ...(missing && { disabled: true }),
      }))}
      onValueChange={(value) => onStateChange(stateOf(value))}
      trigger={<MenuTrigger label={label} />}
    />
  );
}

function stateOf(value: string): DraftStateId {
  const state = draftStateIds.find((id) => id === value);

  if (!state) throw new Error(`Not a Draft state: ${value}`);

  return state;
}
