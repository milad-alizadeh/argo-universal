// A Plugin that registers pages at exact paths and at `:name` patterns, as a deep link reaches them.
export const kitPathsSource = `import { Screen, Text } from '@argo/plugin-kit';

function Item({ params }) {
  return (
    <Screen title="Item">
      <Text>{'Item ' + params.id + ' in ' + params.list}</Text>
    </Screen>
  );
}

function NewItem() {
  return (
    <Screen title="New item">
      <Text>New item form</Text>
    </Screen>
  );
}

function refusal(argo) {
  try {
    argo.pages.register('/tags/:tag', NewItem);
    argo.pages.register('/tags/:name', NewItem);

    return 'registered both';
  } catch (error) {
    return error.message;
  }
}

export function register(argo) {
  const refused = refusal(argo);

  argo.pages.register('/', () => (
    <Screen title="Paths">
      <Text>{refused}</Text>
    </Screen>
  ));
  argo.pages.register('/lists/:list/items/:id', Item);
  argo.pages.register('/lists/inbox/items/new', NewItem);
}`;
