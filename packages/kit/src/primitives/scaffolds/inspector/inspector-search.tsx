import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import {
  SearchField,
  SearchFieldInput,
} from '#primitives/controls/search-field';
import type { SheetScreenSearch } from '#primitives/overlays/sheet';
import type { InspectorProps } from './inspector-props';

export function inspectorSearch(
  props: InspectorProps,
): SheetScreenSearch | undefined {
  if (!props.search || !props.onChangeText) return undefined;

  return {
    label: props.search.label,
    value: props.value ?? '',
    onChangeText: props.onChangeText,
  };
}

export function InspectorSearch(props: InspectorProps): ReactElement | null {
  const search = inspectorSearch(props);

  return search ? (
    <View className="px-4 pb-2">
      {Platform.OS === 'android' ? (
        <View className="h-frame-bar">
          <SearchField {...search} />
        </View>
      ) : (
        <SearchFieldInput {...search} />
      )}
    </View>
  ) : null;
}
