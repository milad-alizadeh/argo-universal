import type {
  ElicitationEnumOption,
  ElicitationPropertySchema,
} from '@repo/contracts';

type StringProperty = Extract<ElicitationPropertySchema, { type: 'string' }>;
type ArrayItems = Extract<
  ElicitationPropertySchema,
  { type: 'array' }
>['items'];
export type NumericProperty = Extract<
  ElicitationPropertySchema,
  { type: 'number' | 'integer' }
>;

const enumChoice = (value: string): ElicitationEnumOption => ({
  const: value,
  title: value,
});

export function elicitationChoices(
  property: ElicitationPropertySchema,
): ElicitationEnumOption[] | undefined {
  if (property.type === 'array') return itemChoices(property.items);
  return property.type === 'string' ? stringChoices(property) : undefined;
}

function itemChoices(items: ArrayItems): ElicitationEnumOption[] {
  return 'anyOf' in items ? items.anyOf : items.enum.map(enumChoice);
}

function stringChoices(
  property: StringProperty,
): ElicitationEnumOption[] | undefined {
  return property.oneOf ?? property.enum?.map(enumChoice);
}

export function numericProperty(
  property: ElicitationPropertySchema,
): property is NumericProperty {
  return property.type === 'number' || property.type === 'integer';
}

export const propertyTitle = (
  name: string,
  property: ElicitationPropertySchema,
): string => property.description ?? property.title ?? name;
