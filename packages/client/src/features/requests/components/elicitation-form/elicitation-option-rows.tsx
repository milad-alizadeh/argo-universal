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

// Each choice is a row of the section, its description under its title.
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
      accessibilityRole="button"
      selected={checked}
      disclosure={false}
      disabled={props.disabled}
      onPress={() => props.onToggle(option.const, !checked)}
      {...optionMark(props.multiple, checked)}
    />
  );
}

const optionSubtitle = (
  option: ElicitationEnumOption,
): GroupedListItemProps['subtitle'] =>
  option.description ? { text: option.description } : undefined;

// iOS ticks a chosen row, as a Settings checklist does; the web ticks a single choice.
const ticksChoice = (multiple: boolean): boolean =>
  Platform.OS === 'ios' || (Platform.OS === 'web' && !multiple);

// Android, and the web's multi-select, lead each row with a checkbox or radio button.
function optionMark(
  multiple: boolean,
  checked: boolean,
): Pick<GroupedListItemProps, 'leading' | 'accessory'> {
  if (ticksChoice(multiple)) return { accessory: checkMark(checked) };

  return {
    leading: <OptionIndicator multiple={multiple} checked={checked} />,
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
