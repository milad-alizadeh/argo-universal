import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type { FieldPickerOption, FieldPickerProps } from './field-picker-model';
import type { FieldPickerScreenProps } from './field-picker-screen';

type Create = NonNullable<FieldPickerProps['create']>;

const sameName = (one: string, other: string): boolean =>
  one.toLocaleLowerCase() === other.toLocaleLowerCase();

const isNew = (options: readonly FieldPickerOption[], name: string): boolean =>
  !options.some((option) => sameName(option.label, name));

const typedName = (
  props: Pick<FieldPickerScreenProps, 'create' | 'query'>,
): string | undefined => (props.create ? props.query?.trim() : undefined);

// The name the search typed, once it is a new one: not empty and not any option's name, whatever its case.
export function nameToCreate(
  props: Pick<FieldPickerScreenProps, 'create' | 'options' | 'query'>,
): string | undefined {
  const typed = typedName(props);

  return typed && isNew(props.options, typed) ? typed : undefined;
}

const createProps = (
  { label, onCreate }: Create,
  name: string,
  clear: () => void,
): React.ComponentProps<typeof ListItem> => ({
  id: 'create',
  title: `${label} “${name}”`,
  leading: <Icon name="add" size="md" />,
  accessibilityLabel: `${label} ${name}`,
  onPress: () => {
    onCreate(name);
    clear();
  },
});

/*
 * The row that creates what the search typed, in a section of its own below the options. A plain function, not a
 * component: the list reads its sections off the `List.Section` elements it is given.
 */
export function createSection(
  props: FieldPickerScreenProps,
): ReactElement | null {
  const name = nameToCreate(props);

  if (!props.create || name === undefined) return null;

  return (
    <List.Section key="create">
      <ListItem
        {...createProps(props.create, name, () => props.onQueryChange?.(''))}
      />
    </List.Section>
  );
}
