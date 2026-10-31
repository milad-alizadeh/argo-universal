import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import type { FieldPickerScreenProps } from './field-picker-screen';
import { ScreenSearchField } from './field-picker-search';

type SearchProps = {
  title: string;
  value: string;
  onChange: (text: string) => void;
};

export function ScreenSearch(props: SearchProps): ReactElement {
  return (
    <View className="px-4 py-3 wide:px-0 wide:py-1">
      <ScreenSearchField
        label={`Search ${props.title}`}
        placeholder="Search"
        value={props.value}
        onChangeText={props.onChange}
      />
    </View>
  );
}

type ScreenStatusMessage = {
  message: string;
  kind: 'loading' | 'error';
};

// Loading or failed options say so where the rows would be.
export function screenStatus(
  props: Pick<FieldPickerScreenProps, 'loading' | 'loadError'>,
): Partial<ScreenStatusMessage> {
  if (props.loadError) return { message: props.loadError, kind: 'error' };

  return props.loading ? { message: 'Loading options…', kind: 'loading' } : {};
}

// Loading and failed choices say so where the rows would be; a failure is announced.
export function ScreenStatus(
  props: Partial<ScreenStatusMessage>,
): ReactElement | null {
  if (!props.message) return null;

  return (
    <Text
      accessibilityRole={props.kind === 'error' ? 'alert' : 'status'}
      role="secondary"
      className="px-4 py-3"
    >
      {props.message}
    </Text>
  );
}

// A search that leaves nothing says so; a picker with no options at all says what is missing.
const emptyMessage = (props: FieldPickerScreenProps): string =>
  props.options.length === 0
    ? (props.emptyText ?? 'No options')
    : 'No matching options';

export function EmptyState(props: FieldPickerScreenProps): ReactElement {
  return (
    <Text accessibilityRole="status" role="secondary" className="px-4 py-3">
      {emptyMessage(props)}
    </Text>
  );
}

export function ScreenFooter(props: FieldPickerScreenProps): ReactNode {
  if (!props.footerAction) return null;

  return (
    <>
      <View role="separator" className="h-px bg-border" />
      <FooterButton action={props.footerAction} onClose={props.onClose} />
    </>
  );
}

type FooterButtonProps = {
  action: NonNullable<FieldPickerScreenProps['footerAction']>;
  onClose: FieldPickerScreenProps['onClose'];
};

function FooterButton({ action, onClose }: FooterButtonProps): ReactElement {
  return (
    <Button
      variant="secondary"
      fullWidth
      icon={action.icon}
      label={action.label}
      onPress={() => {
        onClose?.();
        action.onPress();
      }}
    />
  );
}
