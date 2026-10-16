import type { ElicitationEnumOption } from '@repo/contracts';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { SelectedCheck } from '#primitives/display/selected-check';
import { CheckboxIndicator } from '#primitives/inputs/checkbox';
import {
  GroupedListItem,
  type GroupedListItemProps,
} from '#primitives/lists/grouped-list-item';

export type OptionRowsProps = {
  options: readonly ElicitationEnumOption[];
  selected: readonly string[];
  multiple: boolean;
  disabled: boolean;
  onToggle: (choice: string, checked: boolean) => void;
};

type OptionRowProps = Omit<OptionRowsProps, 'options' | 'selected'> & {
  option: ElicitationEnumOption;
  checked: boolean;
};

// Each choice is a row of the section, its description under its title; a wide card draws compact rows.
export function OptionRows(props: OptionRowsProps): ReactElement {
  return (
    <>
      {props.options.map((option) => (
        <OptionRow
          key={option.const}
          {...props}
          option={option}
          checked={props.selected.includes(option.const)}
        />
      ))}
    </>
  );
}

function OptionRow(props: OptionRowProps): ReactElement {
  const { option, checked } = props;

  return (
    <GroupedListItem
      label={option.title}
      subtitle={optionSubtitle(option)}
      size="sm"
      {...optionRowProps(props)}
      onPress={() => props.onToggle(option.const, !checked)}
      {...optionMark(props.multiple, checked)}
    />
  );
}

const optionRowProps = (
  props: OptionRowProps,
): Pick<
  GroupedListItemProps,
  'accessibilityRole' | 'selected' | 'disclosure' | 'disabled'
> => ({
  accessibilityRole: 'button',
  selected: props.checked,
  disclosure: false,
  disabled: props.disabled,
});

const optionSubtitle = (
  option: ElicitationEnumOption,
): GroupedListItemProps['subtitle'] =>
  option.description ? { text: option.description } : undefined;

/*
 * iOS and the web tick a chosen row, as a Settings checklist does. Android trails each row with
 * Material's checkbox or radio button.
 */
function optionMark(
  multiple: boolean,
  checked: boolean,
): Pick<GroupedListItemProps, 'accessory'> {
  if (Platform.OS !== 'android') return { accessory: checkMark(checked) };

  return {
    accessory: <OptionIndicator multiple={multiple} checked={checked} />,
  };
}

const checkMark = (checked: boolean): ReactElement | undefined =>
  checked ? <SelectedCheck /> : undefined;

function OptionIndicator({
  multiple,
  checked,
}: Pick<OptionRowProps, 'multiple' | 'checked'>): ReactElement {
  return (
    <CheckboxIndicator
      variant="option"
      selection={multiple ? 'multiple' : 'single'}
      value={checked}
    />
  );
}
