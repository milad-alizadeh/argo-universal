import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';

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
