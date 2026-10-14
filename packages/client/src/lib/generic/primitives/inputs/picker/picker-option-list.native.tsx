import type * as React from 'react';
import { Platform } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { NativeActionRow, NativeOptionRows } from './picker-native-options';
import {
  PickerOptionList as WebPickerOptionList,
  type PickerOptionListProps,
} from './picker-option-list.tsx';
import { optionsMessage } from './picker-options-message';

// Android's options are plain Material rows on the sheet; iOS keeps the inset grouped Form.
const listVariant = Platform.OS === 'android' ? 'sidebar' : undefined;

// A phone draws the options with its own list rows; a wide window keeps the popover's flat rows.
export function PickerOptionList<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  if (props.wide) return <WebPickerOptionList {...props} />;

  return (
    <GroupedList variant={listVariant}>
      <OptionsMessage {...props} />
      <GroupedListSection>
        <OptionRows {...props} />
        <FooterAction {...props} />
      </GroupedListSection>
    </GroupedList>
  );
}

// Why there is no option to list, as the first line above the action; a loading row says so itself.
function OptionsMessage<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element | null {
  const message = props.loading ? undefined : optionsMessage(props);

  if (!message) return null;

  return <GroupedListSection footer={message}>{null}</GroupedListSection>;
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
