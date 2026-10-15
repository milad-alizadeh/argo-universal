import { Row, TextInput, useNativeState } from '@expo/ui';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityLabel,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { useFollowedText } from '#primitives/native/followed-text';
import { Host } from '#primitives/native/host';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { ComboboxSearchProps } from './combobox-search-props';

// The platform text field and symbol retain their native drawing and keyboard.
export function ComboboxSearch(props: ComboboxSearchProps): ReactElement {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Row alignment="center" spacing={8}>
        <NativeSymbol name="search" role="control" />
        <SearchInput {...props} />
      </Row>
    </Host>
  );
}

function SearchInput(props: ComboboxSearchProps): ReactElement {
  const text = useNativeState(props.value);
  const onChangeText = useFollowedText(text, props.value, props.onChangeText);

  return (
    <TextInput
      value={text}
      onChangeText={onChangeText}
      placeholder={props.placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      modifiers={fieldModifiers(props.label)}
    />
  );
}

function fieldModifiers(
  label: string,
): React.ComponentProps<typeof TextInput>['modifiers'] {
  return Platform.OS === 'ios'
    ? [accessibilityLabel(label), textFieldStyle('roundedBorder')]
    : [fillMaxWidth(), semantics({ contentDescription: label })];
}
