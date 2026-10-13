import { type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '../field-description';
import { FooterProvider, type SectionFooter } from '../field-footer';
import type { FieldInputProps } from '../field-props';

type FieldProps = Pick<FieldInputProps, 'errors' | 'hint'> & {
  children: ReactNode;
};
export function StandaloneField(props: FieldProps): ReactElement {
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
