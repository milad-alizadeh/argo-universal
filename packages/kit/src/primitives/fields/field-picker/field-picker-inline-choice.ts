import {
  chosenValues,
  choose,
  type FieldPickerOption,
  type FieldPickerProps,
} from './field-picker-model';

export type OptionRowProps = FieldPickerProps & {
  option: FieldPickerOption;
  // A page's single choice closes it once made.
  onClose?: () => void;
};

type OptionChoice = { selected: boolean; toggle: () => void };

// Whether an option is chosen, and what pressing its row does.
export const optionChoice = (props: OptionRowProps): OptionChoice => ({
  selected: chosenValues(props).includes(props.option.value),
  toggle: () => {
    choose(props, props.option.value);

    if (!props.multiple) props.onClose?.();
  },
});
