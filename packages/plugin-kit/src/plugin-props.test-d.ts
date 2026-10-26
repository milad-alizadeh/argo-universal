import type { Action } from '@repo/contracts/plugins/wire';
import { expectTypeOf } from 'vitest';
import type { PluginProps } from './index';

/*
 * Plugin JSX props come from the Contracts schemas through the one mapping App kit props also use. A handler
 * sits beside the built-in Action it replaces, only in top-level props, and every list is readonly. The
 * compiler runs these checks; a failing one is a type error.
 */
type Handler = () => void | Promise<void>;

type PickerRow = PluginProps['FieldGroup.Picker'];

type ActionSplit = Extract<PluginProps['SplitButton'], { options?: undefined }>;

expectTypeOf<PluginProps['Button']['onPress']>().toEqualTypeOf<
  Action | Handler | undefined
>();

expectTypeOf<PickerRow['value']>().toEqualTypeOf<string | readonly string[]>();

expectTypeOf<
  Extract<PickerRow['onValueChange'], (payload: never) => void | Promise<void>>
>().toEqualTypeOf<
  (payload: string | readonly string[]) => void | Promise<void>
>();

expectTypeOf<PickerRow['options']>().toExtend<readonly unknown[]>();

expectTypeOf<ActionSplit['onValueChange']>().toEqualTypeOf<
  ((payload: string) => void | Promise<void>) | undefined
>();

expectTypeOf<PluginProps['Canvas.Group']['translate']>().toEqualTypeOf<
  readonly [number, number] | undefined
>();

expectTypeOf<
  Extract<
    PluginProps['SegmentedControl']['onValueChange'],
    (payload: never) => void | Promise<void>
  >
>().toEqualTypeOf<(value: string) => void | Promise<void>>();
