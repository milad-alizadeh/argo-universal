import {
  EmptyState,
  List,
  ListItem,
  Screen,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

export const root = '/pace';

export type Project = { id: string; name: string; repository: string };

const noProjects = (
  <EmptyState
    title="No GitHub repositories"
    description="Add a Project with a GitHub remote to see its development."
  />
);

function projectRow(p: Project, to: PageTo): JSX.Element {
  return (
    <ListItem
      key={p.id}
      title={p.repository}
      subtitle={p.name}
      onPress={to.go(`${root}/${encodeURIComponent(p.id)}`)}
    />
  );
}

export function picker(projects: Project[], to: PageTo): JSX.Element {
  const rows = projects.map((p) => projectRow(p, to));

  return (
    <Screen title="Development pace">
      <List accessibilityLabel="Choose a repository" empty={noProjects}>
        {rows}
      </List>
    </Screen>
  );
}
