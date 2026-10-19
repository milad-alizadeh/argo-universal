import {
  Action,
  ActionList,
  Detail,
  Metadata,
  Page,
  Pill,
  useState,
} from '@argo/plugin-kit';

const itemMetadata = (
  <Metadata>
    <Metadata.StatusDot title="Status" text="In progress" tone="info" />
    <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
    <Metadata.Pills title="Labels">
      <Pill text="bug" />
      <Pill text="sync" />
    </Metadata.Pills>
    <Metadata.Label title="Opened" text="2 days ago" />
    <Metadata.Link
      title="Docs"
      text="example.com"
      href="https://example.com/hello"
    />
  </Metadata>
);

const content = (closed) =>
  closed
    ? 'Closed. Sync now fetches large repositories in batches.'
    : 'Sync stops after a few minutes on repositories with more than 50,000 files.';

function CloseAction({ closed, onToggle }) {
  return (
    <ActionList>
      <Action
        label={closed ? 'Reopen' : 'Close'}
        icon="check"
        onPress={onToggle}
      />
    </ActionList>
  );
}

// An item page: its content, with Metadata beside it on wide screens.
export function HelloItemPage() {
  const [closed, setClosed] = useState(false);
  const toggle = () => setClosed(!closed);

  return (
    <Page title="Sync fails on large repos">
      <Detail
        markdown={content(closed)}
        metadata={itemMetadata}
        actions={<CloseAction closed={closed} onToggle={toggle} />}
      />
    </Page>
  );
}
