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

// An item page: Detail with its content, and every Metadata field kind in the Screen's aside.
export function Item() {
  return (
    <Screen title="Fixture item" aside={metadata}>
      <Detail markdown="Fixture item content." />
    </Screen>
  );
}
