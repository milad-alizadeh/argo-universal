import type * as React from 'react';
import { type ComponentProps, type RefObject, useRef } from 'react';
import { TextInput, type TextInputInstance, View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import type { SearchQueryProps } from './search-field-props';

// Foundations: SearchField / On content, shared by medium and wide list toolbars; it narrows to fit beside other controls.
export function SearchFieldInput(props: SearchQueryProps): React.JSX.Element {
  const controls = useInputControls(props.onChangeText);

  return (
    <View className="h-8 w-60 max-w-full min-w-0 shrink flex-row items-center gap-2 rounded-full bg-card px-2.5">
      <SearchLens />
      <FieldQuery {...props} {...controls} />
      <ClearSearch value={props.value} clear={controls.clear} />
    </View>
  );
}

interface InputControls {
  input: RefObject<TextInputInstance | null>;
  clear: () => void;
}

function useInputControls(
  onChangeText: SearchQueryProps['onChangeText'],
): InputControls {
  const input = useRef<TextInputInstance>(null);

  return {
    input,
    clear: () => {
      onChangeText('');
      input.current?.focus();
    },
  };
}

function SearchLens(): React.JSX.Element {
  return (
    <Icon
      name="search"
      size="sm"
      className="text-muted-foreground"
      aria-hidden
    />
  );
}

const queryDefaults: ComponentProps<typeof TextInput> = {
  role: 'searchbox',
  placeholderTextColorClassName: 'accent-muted-foreground',
  autoCapitalize: 'none',
  autoCorrect: false,
  className:
    'min-w-0 flex-1 py-0 type-control font-normal text-foreground web:outline-none',
};

type QueryProps = SearchQueryProps & InputControls;

function FieldQuery({ input, ...props }: QueryProps): React.JSX.Element {
  return <TextInput ref={input} {...queryDefaults} {...queryProps(props)} />;
}

function queryProps(
  props: Omit<QueryProps, 'input'>,
): ComponentProps<typeof TextInput> {
  return {
    accessibilityLabel: props.label,
    placeholder: props.label,
    value: props.value,
    onChangeText: props.onChangeText,
    onKeyPress: ({ nativeEvent }) => {
      if (nativeEvent.key === 'Escape') props.clear();
    },
  };
}

const clearDefaults: ComponentProps<typeof IconButton> = {
  icon: 'close',
  variant: 'ghost',
  size: 'xs',
  accessibilityLabel: 'Clear search',
};

function ClearSearch(
  props: Pick<QueryProps, 'value' | 'clear'>,
): React.JSX.Element | null {
  if (!props.value) return null;

  return <IconButton {...clearDefaults} onPress={props.clear} />;
}
