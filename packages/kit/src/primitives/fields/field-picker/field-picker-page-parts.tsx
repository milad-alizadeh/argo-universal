import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { ComboboxSearch } from '#primitives/inputs/combobox';
import type { FieldPickerPageProps } from './field-picker-page';

type SearchProps = {
  title: string;
  value: string;
  onChange: (text: string) => void;
};

export function PageSearch(props: SearchProps): ReactElement {
  return (
    <View className="px-4 py-3 wide:px-0 wide:py-1">
      <ComboboxSearch
        label={`Search ${props.title}`}
        placeholder="Search"
        value={props.value}
        onChangeText={props.onChange}
      />
    </View>
  );
}

export function EmptyState(): ReactElement {
  return (
    <Text accessibilityRole="status" role="secondary" className="px-4 py-3">
      No matching options
    </Text>
  );
}

export function PageFooter(props: FieldPickerPageProps): ReactNode {
  const action = props.footerAction;

  if (!action) return null;

  return (
    <Button
      variant="text"
      label={action.label}
      onPress={() => {
        props.onClose?.();
        action.onPress();
      }}
    />
  );
}
