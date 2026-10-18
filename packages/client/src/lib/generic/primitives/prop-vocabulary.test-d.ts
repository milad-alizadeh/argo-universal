import type { ViewProps } from 'react-native';
import { expectTypeOf } from 'vitest';
import type { IconRole } from '../symbols/icon-role';
import type { SizeClassValue } from '../use-size-class/size-class-value';
import type { Aliases, Primitives } from './prop-vocabulary.mocks';

/*
 * The prop vocabulary of Spec 0015 (#724): one name per idea in every primitive, on web, iOS and Android.
 * Each primitive keeps one props type, so checking that type checks all three drawings. The compiler runs
 * these checks; a failing one is a type error.
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

type SharedPropNames =
  | 'title'
  | 'label'
  | 'subtitle'
  | 'tone'
  | 'color'
  | 'variant'
  | 'size'
  | 'media';

type ArrangementPropNames = 'direction' | 'align' | 'gap';

type DomainNouns =
  | 'agent'
  | 'checkout'
  | 'connection'
  | 'feed'
  | 'goal'
  | 'permission'
  | 'plan'
  | 'project'
  | 'registry'
  | 'request'
  | 'session'
  | 'shell'
  | 'subagent'
  | 'turn';

// Names the vocabulary replaced: `variant`, `options`, `accessibilityRole`, `tone` and `selected` say these now.
type Retired =
  | 'appearance'
  | 'choices'
  | 'semanticRole'
  | 'footerTone'
  | 'aria-pressed'
  | 'supporting'
  | 'supportingText'
  | 'caption';

// Every key of every member of a union, where `keyof` alone keeps only the shared ones.
type Keys<Props> = Props extends unknown ? keyof Props : never;

type Values<Props, Key extends PropertyKey> = Props extends unknown
  ? Key extends keyof Props
    ? NonNullable<Props[Key]>
    : never
  : never;

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

type DomainPropNames = {
  [Name in keyof Primitives]: Extract<Keys<Primitives[Name]>, DomainNouns>;
};

// `role` names typography or an icon's placement, alone or one per size class; ARIA is `accessibilityRole`. React Native's own `role` passes through.
type OwnRoles = {
  [Name in keyof Primitives]: Exclude<
    Values<Primitives[Name], 'role'>,
    | SizeClassValue<Aliases['TextRole']>
    | SizeClassValue<IconRole>
    | NonNullable<ViewProps['role']>
  >;
};

// A type is either checked as props or set aside as an alias, never both.
expectTypeOf<Extract<keyof Primitives, keyof Aliases>>().toBeNever();

// Retired vocabulary cannot return as primitive prop names.
expectTypeOf<RetiredNames>().toEqualTypeOf<Each<never>>();

// Every primitive sizes on one xs–xl scale.
expectTypeOf<OffScaleSizes>().toEqualTypeOf<Each<never>>();

// Colour meaning comes from one tone set, and Text and Icon draw all of it.
expectTypeOf<OffVocabularyTones>().toEqualTypeOf<Each<never>>();

// Shared vocabulary names and list arrangement names stay explicit; domain nouns never become kit props.
expectTypeOf<SharedPropNames>().toEqualTypeOf<
  | 'title'
  | 'label'
  | 'subtitle'
  | 'tone'
  | 'color'
  | 'variant'
  | 'size'
  | 'media'
>();

expectTypeOf<ArrangementPropNames>().toEqualTypeOf<
  'direction' | 'align' | 'gap'
>();

expectTypeOf<Primitives['StackProps']['direction']>().toEqualTypeOf<
  'row' | 'column'
>();

expectTypeOf<Keys<Primitives['StackProps']>>().toExtend<
  ArrangementPropNames | 'children'
>();

expectTypeOf<Primitives['ComboboxOption']['subtitle']>().toEqualTypeOf<
  string | undefined
>();

expectTypeOf<
  Primitives['PickerProps']['options'][number]['subtitle']
>().toEqualTypeOf<string | undefined>();

expectTypeOf<DomainPropNames>().toEqualTypeOf<Each<never>>();

expectTypeOf<Aliases['Tone']>().toEqualTypeOf<Tone>();

expectTypeOf<Aliases['BadgeTone']>().toExtend<Tone>();

expectTypeOf<Aliases['ButtonSize']>().toExtend<Size>();

expectTypeOf<
  NonNullable<Primitives['TextProps']['tone']>
>().toEqualTypeOf<Tone>();

expectTypeOf<
  NonNullable<Primitives['IconProps']['tone']>
>().toEqualTypeOf<Tone>();

expectTypeOf<
  Values<Primitives['AlertAction'], 'tone'>
>().toEqualTypeOf<'danger'>();

expectTypeOf<
  Values<Primitives['ButtonProps'], 'tone'>
>().toEqualTypeOf<'danger'>();

// `role` is for typography and icon placement only.
expectTypeOf<OwnRoles>().toEqualTypeOf<Each<never>>();

expectTypeOf<Extract<Keys<Primitives['AlertAction']>, 'role'>>().toBeNever();

expectTypeOf<Extract<Keys<Primitives['MenuAction']>, 'role'>>().toBeNever();

// Rows name themselves with `label`; menus offer `options`.
expectTypeOf<
  Extract<Keys<Primitives['GroupedListItemProps']>, 'title'>
>().toBeNever();

expectTypeOf<
  Extract<Keys<Primitives['DrawerItemProps']>, 'title'>
>().toBeNever();

expectTypeOf<
  Primitives['GroupedListItemProps']['label']
>().toEqualTypeOf<string>();

expectTypeOf<Primitives['DrawerItemProps']['label']>().toEqualTypeOf<string>();

expectTypeOf<
  Extract<Keys<Primitives['MenuProps']>, 'options'>
>().toEqualTypeOf<'options'>();

expectTypeOf<
  Extract<Keys<Primitives['SplitButtonProps']>, 'options'>
>().toEqualTypeOf<'options'>();

// A chosen IconButton is `selected`; its glyph fill is apart from its variant.
expectTypeOf<Primitives['IconButtonProps']['selected']>().toEqualTypeOf<
  boolean | undefined
>();

expectTypeOf<
  Extract<keyof Primitives['IconButtonProps'], 'filled'>
>().toBeNever();
