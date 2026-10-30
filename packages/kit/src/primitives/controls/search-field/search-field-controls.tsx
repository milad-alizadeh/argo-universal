import type * as React from 'react';
import { type RefObject, useRef } from 'react';
import {
  Pressable,
  type TextInputInstance,
  type TextInput,
  type ViewInstance,
} from 'react-native';
import { Lens } from './search-field-lens';
import { type MorphState, OpenField } from './search-field-parts';
import type { LayoutHandler } from './search-field-props';
import { QueryInput } from './search-field-query';

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

type TriggerRef = RefObject<ViewInstance | null>;

type InputRef = RefObject<TextInputInstance | null>;

// Closing hands focus back to the search button, so the keyboard keeps its place.
export function SearchControls(props: ControlsProps): React.JSX.Element {
  const input = useRef<TextInputInstance>(null);
  const trigger = useRef<ViewInstance>(null);
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
      className="size-8"
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
