import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';

export function RemoveProject(): ReactElement {
  return (
    <List.Section>
      <ListItem.Button
        title="Remove Project"
        tone="danger"
        disabled
        description="Argo forgets this Project and archives its Sessions. The folder and its files stay."
      />
    </List.Section>
  );
}
