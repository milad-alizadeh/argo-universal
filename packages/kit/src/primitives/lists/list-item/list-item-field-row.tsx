import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  type DescribedField,
  FooterProvider,
  FieldDescriptionFooter,
  useFieldDescription,
  type FieldDescription,
} from '#primitives/fields/field-description';
import { ListItemFrame } from './list-item';

type FieldRowProps = DescribedField & {
  label: string;
  disabled?: boolean;
  children: ReactNode;
};

// ADR-0033: a field on iOS and desktop is a grouped row; its hint and error sit in the section footer.
export function ListItemFieldRow(props: FieldRowProps): ReactElement {
  const description = useFieldDescription(props);

  return (
    <>
      <FooterProvider value={footerOf(description)}>
        <ListItemFrame
          title={props.label}
          disabled={props.disabled}
          content={props.children}
        />
      </FooterProvider>
      <FieldFooter {...description} />
    </>
  );
}

const footerOf = (
  description: FieldDescription,
): React.ComponentProps<typeof FooterProvider>['value'] => ({
  id: description.descriptionId ?? description.footerId,
  failure: description.invalid,
});

function FieldFooter(props: FieldDescription): ReactElement | null {
  return props.footer ? (
    <View className="px-4 py-2 wide:px-5">
      <FieldDescriptionFooter {...props} />
    </View>
  ) : null;
}
