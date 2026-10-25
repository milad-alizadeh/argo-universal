import type { ComponentType } from 'react';
import {
  chosenLogo,
  choiceSummary,
  type FieldPickerOption,
  type FieldPickerProps,
  type PickerProps,
} from './field-picker-model';

export type PickerKind = 'pill' | 'inline' | 'menu' | 'page';

/*
 * The one place presentation and `multiple` decide what a picker draws: a `pill` trigger is the toolbar pill, `inline`
 * is option rows, `menu` opens in place when the platform's menu can hold the choice (a `multiple` one only where
 * `menuHoldsMultiple`), and a `page`, or any other `menu`, opens the page.
 */
// oxlint-disable-next-line max-params -- the four facts the picker's kind rests on, read as one table.
export function pickerKind(
  presentation: FieldPickerProps['presentation'],
  multiple: boolean,
  trigger: FieldPickerProps['trigger'],
  menuHoldsMultiple: boolean,
): PickerKind {
  if (trigger === 'pill') return 'pill';

  return kindOfPresentation(!multiple || menuHoldsMultiple)[presentation];
}

const kindOfPresentation = (
  menuHoldsChoice: boolean,
): Record<FieldPickerProps['presentation'], PickerKind> => ({
  menu: menuHoldsChoice ? 'menu' : 'page',
  page: 'page',
  inline: 'inline',
});

export type PickerRowProps = Pick<
  FieldPickerProps,
  'title' | 'leading' | 'disabled'
> & {
  // The chosen option's logo, which the row leads with in place of `leading`.
  logo?: string;
  summary: string;
  onPress?: () => void;
};

export type OptionRowProps = PickerProps & {
  option: FieldPickerOption;
  // A page's single choice closes it once made.
  onClose?: () => void;
};

// What a platform draws: the row that opens a page, the menu opened in place, one option's row, and what its menu holds.
export type PickerDrawing = {
  Row: ComponentType<PickerRowProps>;
  Menu: ComponentType<PickerProps>;
  OptionRow: ComponentType<OptionRowProps>;
  // Whether its `menu` holds a `multiple` choice; otherwise that choice opens the page.
  menuHoldsMultiple: boolean;
};

type OptionChoice = { selected: boolean; toggle: () => void };

// Whether an option is chosen, and what pressing its row does.
export const optionChoice = (props: OptionRowProps): OptionChoice => ({
  selected: props.held.includes(props.option.value),
  toggle: () => {
    props.pick(props.option.value);

    if (!props.multiple) props.onClose?.();
  },
});

export const rowProps = (props: PickerProps): PickerRowProps => ({
  title: props.title,
  leading: props.leading,
  logo: chosenLogo(props),
  summary: choiceSummary(props),
  disabled: props.disabled,
});
