import { Detail, Metadata, Screen, Pill } from '@argo/plugin-kit';

const metadata = (
  <Metadata>
    <Metadata.StatusDot title="Status" text="Open" tone="info" />
    <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
    <Metadata.Pills title="Labels">
      <Pill text="fixture" />
    </Metadata.Pills>
    <Metadata.Label title="Opened" text="Today" />
    <Metadata.Link
      title="Docs"
      text="example.com"
      href="https://example.com/fixture"
    />
  </Metadata>
);

// An item page: Detail with every Metadata field kind.
export function Item() {
  return (
    <Screen title="Fixture item">
      <Detail markdown="Fixture item content." metadata={metadata} />
    </Screen>
  );
}
