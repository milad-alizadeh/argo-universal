import type * as React from 'react';
import { type RefObject, useRef } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { iconButtonClasses } from '#primitives/actions/icon-button';
import { Lens, type MorphState, OpenField } from './search-field-parts';
import { QueryInput } from './search-field-query';

export type LayoutHandler = NonNullable<
  React.ComponentProps<typeof View>['onLayout']
>;

export interface ControlsProps {
  onFocus?: React.ComponentProps<typeof TextInput>['onFocus'];
  onBlur?: React.ComponentProps<typeof TextInput>['onBlur'];
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  morph: MorphState;
  setOpen: (open: boolean) => void;
  onTriggerLayout: LayoutHandler;
}

type TriggerRef = RefObject<View | null>;

type InputRef = RefObject<TextInput | null>;

// Closing hands focus back to the search button, so the keyboard keeps its place.
export function SearchControls(props: ControlsProps): React.JSX.Element {
  const input = useRef<TextInput>(null);
  const trigger = useRef<View>(null);
  const close = useCloseSearch(props, input, trigger);
  const open = useOpenSearch(props.setOpen, input);

  return (
    <>
      <SearchTrigger {...props} trigger={trigger} onOpen={open} />
      <OpenField {...props.morph} onClose={close}>
        <FieldQuery {...props} input={input} onEscape={close} />
      </OpenField>
      <Lens {...props.morph} />
    </>
  );
}

function useCloseSearch(
  props: ControlsProps,
  input: InputRef,
  trigger: TriggerRef,
): () => void {
  return (): void => {
    props.setOpen(false);
    props.onChangeText('');
    input.current?.blur();
    trigger.current?.focus();
  };
}

type QueryProps = ControlsProps & { input: InputRef; onEscape: () => void };

function FieldQuery({
  input,
  onEscape,
  ...props
}: QueryProps): React.JSX.Element {
  return (
    <QueryInput
      {...props}
      ref={input}
      editable={props.morph.open}
      onEscape={onEscape}
    />
  );
}

type TriggerProps = ControlsProps & { trigger: TriggerRef; onOpen: () => void };

function SearchTrigger({ trigger, ...props }: TriggerProps): React.JSX.Element {
  return (
    <Pressable
      ref={trigger}
      accessibilityLabel={props.label}
      {...hiddenWhenOpen(props.morph.open)}
      role="button"
      onPress={props.onOpen}
      onLayout={props.onTriggerLayout}
      className={iconButtonClasses({ variant: 'ghost', size: 'xs' })}
    />
  );
}

function useOpenSearch(
  setOpen: (open: boolean) => void,
  input: InputRef,
): () => void {
  return (): void => {
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
  };
}

function hiddenWhenOpen(
  open: boolean,
): Pick<
  React.ComponentProps<typeof Pressable>,
  'accessibilityState' | 'aria-hidden' | 'focusable' | 'pointerEvents'
> {
  return {
    accessibilityState: { expanded: open },
    'aria-hidden': open,
    focusable: !open,
    pointerEvents: open ? 'none' : 'auto',
  };
}
