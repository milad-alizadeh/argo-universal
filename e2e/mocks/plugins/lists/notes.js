import { Button, Stack, Text } from '@argo/plugin-kit';

// Whether the Notes card has something to show; every page of the Plugin's one process reads the same flag.
let filled = false;

// A card with nothing to show returns null, and Argo draws no card, tab or header action for it.
export function defineNotes(argo) {
  argo.operations.register('fillNotes', () => ({ filled: (filled = true) }));
  argo.operations.register('emptyNotes', () => ({ filled: (filled = false) }));

  argo.pages.define('/notes', {
    load: () => filled,
    render: (shown) => (shown ? <Text>Notes card summary</Text> : null),
  });
  argo.pages.define('/notes/full', {
    load: () => null,
    render: () => <Text>Notes in full</Text>,
  });
}

// The buttons that fill and empty the card, drawn under the Lists page.
export function NotesSwitch({ to }) {
  return (
    <Stack direction="row">
      <Button label="Fill the Notes card" onPress={to.run('fillNotes')} />
      <Button label="Empty the Notes card" onPress={to.run('emptyNotes')} />
    </Stack>
  );
}
