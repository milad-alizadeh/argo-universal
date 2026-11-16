import { Label } from '#primitives/content/label';
import { FieldGroup } from './field-group';
import type { FieldGroupProps } from './field-group';
import { rows, section } from './field-group-properties.mocks';

const longPath =
  '~/Developer/argo-universal/packages/kit/src/primitives/fields/field-group/properties';

const path = (text: string): React.JSX.Element => (
  <FieldGroup.Value title="Path">
    <Label text={text} />
  </FieldGroup.Value>
);

export const readOnlyFields = {
  children: section(rows),
} satisfies FieldGroupProps;

export const longPathFields = {
  children: section(path(longPath)),
} satisfies FieldGroupProps;

export const groupedPathFields = {
  children: section(path('~/Folder/item'), 'Section'),
} satisfies FieldGroupProps;
