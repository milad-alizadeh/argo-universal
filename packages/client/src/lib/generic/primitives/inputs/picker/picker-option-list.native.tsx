import type * as React from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { NativeActionRow, NativeOptionRows } from './picker-native-options';
import {
  PickerOptionList as WebPickerOptionList,
  type PickerOptionListProps,
} from './picker-option-list.tsx';
import { optionsMessage } from './picker-options-message';

// A phone draws the options with its own list rows; a wide window keeps the popover's flat rows.
export function PickerOptionList<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  if (props.wide) return <WebPickerOptionList {...props} />;

  return (
    <GroupedList>
      <GroupedListSection footer={sectionFooter(props)}>
        <OptionRows {...props} />
        <FooterAction {...props} />
      </GroupedListSection>
    </GroupedList>
  );
}

// Why there is no option to list; a loading row says so itself.
function sectionFooter<Value extends string>(
  props: PickerOptionListProps<Value>,
): string | undefined {
  return props.loading ? undefined : optionsMessage(props);
}

function OptionRows<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  if (props.loading)
    return <GroupedListItem loading label={props.loadingLabel ?? 'Loading…'} />;

  return <NativeOptionRows {...props} />;
}

function FooterAction<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element | null {
  const action = props.footerAction;

  if (!action) return null;

  return (
    <NativeActionRow action={{ ...action, accessibilityLabel: action.label }} />
  );
}
