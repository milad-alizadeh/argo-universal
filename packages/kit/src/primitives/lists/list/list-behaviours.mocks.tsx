import { useState, type ReactElement, type ReactNode } from 'react';
import { Action } from '#primitives/actions/action';
import { Screen } from '#primitives/scaffolds/screen';
import { List } from './list';
import type { ListProps } from './list-props';

type ExampleProps = Omit<ListProps<string>, 'children'>;

type SetItems = (
  items:
    | readonly string[]
    | ((current: readonly string[]) => readonly string[]),
) => void;

interface ExampleSelection {
  items: readonly string[];
  selection: NonNullable<ExampleProps['selection']>;
  actions: ReactNode;
}

const initialItems = (props: ExampleProps): readonly string[] =>
  props.items ?? [];

const initialSelection = (props: ExampleProps): readonly string[] =>
  props.selection?.selected ?? [];

const renderItem = (
  props: ExampleProps,
): NonNullable<ExampleProps['renderItem']> => props.renderItem ?? (() => null);

function appended(items: readonly string[]): string[] {
  return [
    ...items,
    ...Array.from(
      { length: 20 },
      (_, index) => `Item ${items.length + index + 1}`,
    ),
  ];
}

async function loadPage(setItems: SetItems, fail?: boolean): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (fail) throw new Error('Page refused');
  setItems(appended);
}

function usePagedExample(
  props: ExampleProps & { fail?: boolean },
): Pick<ExampleProps, 'items' | 'pagination' | 'renderItem'> {
  const [items, setItems] = useState(initialItems(props));

  const pagination = {
    hasMore: items.length < 60,
    onLoadMore: (): Promise<void> => loadPage(setItems, props.fail),
  };

  return { items, pagination, renderItem: renderItem(props) };
}

export function PagedExample(
  props: ExampleProps & { fail?: boolean },
): ReactElement {
  const drawing = usePagedExample(props);

  return (
    <List
      {...props}
      {...drawing}
      items={drawing.items ?? []}
      renderItem={renderItem(props)}
    />
  );
}

function removeAction(
  selected: readonly string[],
  remove: () => void,
): ReactElement {
  return (
    <Action
      label="Remove"
      icon="archive"
      disabled={selected.length === 0}
      onPress={remove}
    />
  );
}

function useExampleSelection(props: ExampleProps): ExampleSelection {
  const [selected, onChange] = useState(initialSelection(props));
  const [items, setItems] = useState(initialItems(props));

  const remove = (): void => {
    setItems(items.filter((item) => !selected.includes(item)));
    onChange([]);
  };

  return {
    items,
    selection: { mode: 'multiple', selected, onChange },
    actions: removeAction(selected, remove),
  };
}

export function SelectionExample(props: ExampleProps): ReactElement {
  const selected = useExampleSelection(props);

  return <List {...props} {...selected} renderItem={renderItem(props)} />;
}

function appendAction(items: readonly string[], set: SetItems): ReactElement {
  return (
    <Action
      label="Append"
      icon="add"
      onPress={() => set([...items, `Item ${items.length + 1}`])}
    />
  );
}

export function LogExample(props: ExampleProps): ReactElement {
  const [items, setItems] = useState(initialItems(props));

  return (
    <Screen title="Log" actions={appendAction(items, setItems)}>
      <List {...props} items={items} renderItem={renderItem(props)} />
    </Screen>
  );
}
