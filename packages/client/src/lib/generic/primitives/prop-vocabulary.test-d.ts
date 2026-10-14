import type { ViewProps } from 'react-native';
import { describe, expectTypeOf, it } from 'vitest';
import type { ButtonProps } from '#primitives/buttons/button';
import type { ButtonGroupProps } from '#primitives/buttons/button-group';
import type { FilterPillProps } from '#primitives/buttons/filter-pill';
import type { IconButtonProps } from '#primitives/buttons/icon-button';
import type { SplitButtonProps } from '#primitives/buttons/split-button';
import type { BadgeProps } from '#primitives/display/badge';
import type { DisclosureChevronProps } from '#primitives/display/disclosure-chevron';
import type { IconProps } from '#primitives/display/icon';
import type { LiquidGlassProps } from '#primitives/display/liquid-glass';
import type { SelectedCheckProps } from '#primitives/display/selected-check';
import type { SpinnerProps } from '#primitives/display/spinner';
import type { TextProps, TextRole } from '#primitives/display/text';
import type { FieldProps } from '#primitives/fields/field';
import type { CheckboxProps } from '#primitives/inputs/checkbox';
import type { ComboboxSearchProps } from '#primitives/inputs/combobox-search';
import type { PickerProps } from '#primitives/inputs/picker';
import type { RichTextareaProps } from '#primitives/inputs/rich-textarea';
import type { SearchFieldProps } from '#primitives/inputs/search-field';
import type { SliderProps } from '#primitives/inputs/slider';
import type { SwitchProps } from '#primitives/inputs/switch';
import type { TextInputProps } from '#primitives/inputs/text-input';
import type { TextareaProps } from '#primitives/inputs/textarea';
import type { DrawerItemProps } from '#primitives/lists/drawer-item';
import type { GroupedListProps } from '#primitives/lists/grouped-list';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import type { GroupedListSectionProps } from '#primitives/lists/grouped-list-section';
import type { AlertAction, AlertProps } from '#primitives/overlays/alert';
import type { BottomSheetProps } from '#primitives/overlays/bottom-sheet';
import type { DialogContentProps } from '#primitives/overlays/dialog';
import type { MenuAction, MenuProps } from '#primitives/overlays/menu';
import type { PopoverProps } from '#primitives/overlays/popover';
import type { IconRole } from '../symbols/icon-role';

/*
 * The prop vocabulary of Spec 0015 (#724): one name per idea in every primitive, on web, iOS and Android.
 * Each primitive keeps one props type, so checking that type checks all three drawings.
 */
type Tone =
  | 'neutral'
  | 'muted'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'done';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Names the vocabulary replaced: `variant`, `options`, `accessibilityRole`, `tone` and `selected` say these now.
type Retired =
  | 'appearance'
  | 'choices'
  | 'semanticRole'
  | 'footerTone'
  | 'aria-pressed';

// Every key of every member of a union, where `keyof` alone keeps only the shared ones.
type Keys<Props> = Props extends unknown ? keyof Props : never;

type Values<Props, Key extends PropertyKey> = Props extends unknown
  ? Key extends keyof Props
    ? NonNullable<Props[Key]>
    : never
  : never;

type Primitives = {
  Alert: AlertProps;
  Badge: BadgeProps;
  BottomSheet: BottomSheetProps;
  Button: ButtonProps;
  ButtonGroup: ButtonGroupProps;
  Checkbox: CheckboxProps;
  ComboboxSearch: ComboboxSearchProps;
  DialogContent: DialogContentProps;
  DisclosureChevron: DisclosureChevronProps;
  DrawerItem: DrawerItemProps;
  Field: FieldProps;
  FilterPill: FilterPillProps;
  GroupedList: GroupedListProps;
  GroupedListItem: GroupedListItemProps;
  GroupedListSection: GroupedListSectionProps;
  Icon: IconProps;
  IconButton: IconButtonProps;
  LiquidGlass: LiquidGlassProps;
  Menu: MenuProps;
  Picker: PickerProps<string>;
  Popover: PopoverProps;
  RichTextarea: RichTextareaProps;
  SearchField: SearchFieldProps;
  SelectedCheck: SelectedCheckProps;
  Slider: SliderProps;
  Spinner: SpinnerProps;
  SplitButton: SplitButtonProps;
  Switch: SwitchProps;
  Text: TextProps;
  TextInput: TextInputProps;
  Textarea: TextareaProps;
};

type Each<Check> = { [Name in keyof Primitives]: Check };

type RetiredNames = {
  [Name in keyof Primitives]: Extract<Keys<Primitives[Name]>, Retired>;
};

type OffScaleSizes = {
  [Name in keyof Primitives]: Exclude<Values<Primitives[Name], 'size'>, Size>;
};

type OffVocabularyTones = {
  [Name in keyof Primitives]: Exclude<Values<Primitives[Name], 'tone'>, Tone>;
};

// `role` names typography or an icon's placement; ARIA is `accessibilityRole`. React Native's own `role` passes through.
type OwnRoles = {
  [Name in keyof Primitives]: Exclude<
    Values<Primitives[Name], 'role'>,
    TextRole | IconRole | NonNullable<ViewProps['role']>
  >;
};

describe('the prop vocabulary', () => {
  it('retires appearance, choices, semanticRole, footerTone and aria-pressed', () => {
    expectTypeOf<RetiredNames>().toEqualTypeOf<Each<never>>();
  });

  it('sizes every primitive on one xs–xl scale', () => {
    expectTypeOf<OffScaleSizes>().toEqualTypeOf<Each<never>>();
  });

  it('draws colour meaning from one tone set', () => {
    expectTypeOf<OffVocabularyTones>().toEqualTypeOf<Each<never>>();
    expectTypeOf<Values<AlertAction, 'tone'>>().toEqualTypeOf<'danger'>();
  });

  it('keeps role for typography and icon placement', () => {
    expectTypeOf<OwnRoles>().toEqualTypeOf<Each<never>>();
    expectTypeOf<Extract<Keys<AlertAction>, 'role'>>().toBeNever();
    expectTypeOf<Values<ButtonProps, 'tone'>>().toEqualTypeOf<'danger'>();
  });

  it('names rows and options the same way', () => {
    expectTypeOf<Extract<Keys<GroupedListItemProps>, 'title'>>().toBeNever();
    expectTypeOf<Extract<Keys<DrawerItemProps>, 'title'>>().toBeNever();
    expectTypeOf<GroupedListItemProps['label']>().toEqualTypeOf<string>();
    expectTypeOf<DrawerItemProps['label']>().toEqualTypeOf<string>();
    expectTypeOf<
      Extract<Keys<MenuProps>, 'options'>
    >().toEqualTypeOf<'options'>();
    expectTypeOf<
      Extract<Keys<SplitButtonProps>, 'options'>
    >().toEqualTypeOf<'options'>();
    expectTypeOf<Extract<Keys<MenuAction>, 'role'>>().toBeNever();
  });

  it('marks a chosen IconButton as selected, its glyph fill apart from its variant', () => {
    expectTypeOf<IconButtonProps['selected']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<Extract<keyof IconButtonProps, 'filled'>>().toBeNever();
  });

  it('gives Text and Icon a tone', () => {
    expectTypeOf<NonNullable<TextProps['tone']>>().toEqualTypeOf<Tone>();
    expectTypeOf<NonNullable<IconProps['tone']>>().toEqualTypeOf<Tone>();
  });
});
