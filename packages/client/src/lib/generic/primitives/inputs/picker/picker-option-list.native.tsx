import type * as React from 'react';
import { Platform } from 'react-native';
import { FieldLayout } from '#primitives/fields/field-layout';
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

// iOS cards only the options: the loading line and the action are plain rows below the card.
const plainExtras = Platform.OS === 'ios';

// A phone draws the options with its own list rows; a wide window keeps the popover's flat rows.
export function PickerOptionList<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  if (props.wide) return <WebPickerOptionList {...props} />;

  return (
    <GroupedList variant={listVariant} fit={props.fit}>
      <OptionsMessage {...props} />
      {plainExtras ? <CardedOptions {...props} /> : <OneSection {...props} />}
    </GroupedList>
  );
}

function OneSection<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  return (
    <GroupedListSection>
      <OptionRows {...props} />
      <FooterAction {...props} />
    </GroupedListSection>
  );
}

function CardedOptions<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  return (
    <>
      <OptionCard {...props} />
      <FieldLayout value="sidebar">
        <GroupedListSection>
          {props.loading && <LoadingRow label={props.loadingLabel} />}
          <FooterAction {...props} />
        </GroupedListSection>
      </FieldLayout>
    </>
  );
}

// The listed options in their card; none while they load or when none match.
function OptionCard<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element | null {
  if (props.loading || props.options.length === 0) return null;

  return (
    <GroupedListSection>
      <NativeOptionRows {...props} />
    </GroupedListSection>
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
  if (props.loading) return <LoadingRow label={props.loadingLabel} />;

  return <NativeOptionRows {...props} />;
}

function LoadingRow(props: { label?: string }): React.JSX.Element {
  return (
    <GroupedListItem loading tone="muted" label={props.label ?? 'Loading…'} />
  );
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
