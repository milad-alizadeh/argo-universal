import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import {
  FooterProvider,
  type SectionFooter,
} from '#primitives/fields/field-description';
import type { FieldProps } from './field-props';

export function Field(props: FieldProps): ReactElement {
  const description = useFieldDescription(props);

  return (
    <View className="gap-1.5">
      <FooterProvider value={footerContext(description)}>
        {props.children}
      </FooterProvider>
      <FieldDescriptionFooter {...description} />
    </View>
  );
}

function footerContext(
  props: Pick<FieldDescription, 'descriptionId' | 'invalid'>,
): SectionFooter | undefined {
  return props.descriptionId
    ? { id: props.descriptionId, failure: props.invalid }
    : undefined;
}
