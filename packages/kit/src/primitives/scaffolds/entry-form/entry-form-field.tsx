import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldText } from '#primitives/fields/field-text';
import { Host } from '#primitives/native/host';

export type EntryFormFieldProps = React.ComponentProps<typeof FieldText> & {
  description: string;
};

// Phones retain their native Form row; desktop puts a persistent label above a bounded input.
export function EntryFormField(props: EntryFormFieldProps): ReactElement {
  if (Platform.OS !== 'web') return <NativeField {...props} />;

  return <DesktopField {...props} />;
}

function NativeField({
  description,
  ...props
}: EntryFormFieldProps): ReactElement {
  return (
    <FieldGroup disabled={props.disabled}>
      <FieldGroup.Section footer={description}>
        <FieldGroup.TextField {...props} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function DesktopField(props: EntryFormFieldProps): ReactElement {
  return (
    <View className="gap-2">
      <Text role="heading" aria-level={2}>
        {props.title}
      </Text>
      <FieldInput {...props} />
      <Text role="secondary" tone="muted">
        {props.description}
      </Text>
    </View>
  );
}

function FieldInput(
  props: React.ComponentProps<typeof FieldText>,
): ReactElement {
  return (
    <View className="min-h-11 justify-center rounded-lg border border-border bg-card px-3 py-2 web:focus-within:ring-2 web:focus-within:ring-focus">
      <Host>
        <FieldText {...props} hideTitle />
      </Host>
    </View>
  );
}
