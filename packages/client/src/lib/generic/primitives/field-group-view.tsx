import type * as React from 'react';
import { ScrollView } from 'react-native';
import { FieldLayout } from './field-layout';
import type { FieldGroupProps } from './field-props';

export function FieldGroup({
  children,
  variant = 'grouped',
}: FieldGroupProps): React.JSX.Element {
  return (
    <FieldLayout value={variant}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-gutter-list pb-6 pt-2 wide:gap-3 wide:px-2 wide:pt-0"
      >
        {children}
      </ScrollView>
    </FieldLayout>
  );
}
