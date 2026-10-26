import type { KitSchemaProps } from '@repo/contracts/kit-props';
import type { ComponentProps } from 'react';
import { expectTypeOf } from 'vitest';
import type { SegmentedControlProps } from '../controls/segmented-control';
import type { FieldGroup } from '../fields/field-group';
import type { KitProps } from './index';

/*
 * App kit props come from the Contracts schemas through the one mapping Plugin JSX also uses. The App draws
 * its own choices and nodes and receives handlers alone, inside nested action data too. The compiler runs
 * these checks; a failing one is a type error.
 */
type DrawnNode = { drawn: true };

type ActionMenu = Extract<KitProps<'Menu'>, { actions: unknown }>;

expectTypeOf<ActionMenu['actions'][number]['onPress']>().toEqualTypeOf<
  () => void
>();

expectTypeOf<ActionMenu['onValueChange']>().toEqualTypeOf<undefined>();

expectTypeOf<KitProps<'Callout', string, DrawnNode>['actions']>().toEqualTypeOf<
  DrawnNode | undefined
>();

expectTypeOf<KitProps<'Canvas.Group'>['translate']>().toEqualTypeOf<
  [number, number] | undefined
>();

expectTypeOf<
  Omit<KitSchemaProps['SegmentedControl'], 'onValueChange'>
>().toExtend<Omit<SegmentedControlProps, 'onValueChange'>>();

expectTypeOf<SegmentedControlProps['onValueChange']>().toEqualTypeOf<
  (value: string) => void
>();

expectTypeOf<
  Omit<
    KitSchemaProps['FieldGroup.SecretField'],
    'onChangeText' | 'onFocus' | 'onBlur' | 'onSubmit'
  >
>().toExtend<
  Omit<
    ComponentProps<typeof FieldGroup.SecretField>,
    'onChangeText' | 'onFocus' | 'onBlur' | 'onSubmit'
  >
>();
