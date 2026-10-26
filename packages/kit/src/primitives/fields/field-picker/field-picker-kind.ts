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
export type KindFacts = Pick<FieldPickerProps, 'presentation' | 'trigger'> & {
  multiple: boolean;
  menuHoldsMultiple: boolean;
};

export function pickerKind(facts: KindFacts): PickerKind {
  if (facts.trigger === 'pill') return 'pill';

  const menuHoldsChoice = !facts.multiple || facts.menuHoldsMultiple;

  return kindOfPresentation(menuHoldsChoice)[facts.presentation];
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

// The whole picker is disabled, or just this option.
export const isOptionOff = (
  props: Pick<PickerProps, 'disabled'> & { option: FieldPickerOption },
): boolean => Boolean(props.disabled || props.option.disabled);

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
