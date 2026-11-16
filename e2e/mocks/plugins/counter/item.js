import {
  Avatar,
  Detail,
  FieldGroup,
  Label,
  Link,
  Pill,
  Screen,
  StatusDot,
} from '@argo/plugin-kit';

const properties = (
  <FieldGroup>
    <FieldGroup.Section>
      <FieldGroup.Value title="Status" value="Open">
        <StatusDot tone="info" />
      </FieldGroup.Value>
      <FieldGroup.Value title="Assignee">
        <Avatar name="Ana Ruiz" accessibilityLabel="Ana Ruiz" />
      </FieldGroup.Value>
      <FieldGroup.Value title="Labels">
        <Pill text="fixture" />
      </FieldGroup.Value>
      <FieldGroup.Value title="Opened">
        <Label text="Today" />
      </FieldGroup.Value>
      <FieldGroup.Value title="Docs">
        <Link label="example.com" href="https://example.com/fixture" />
      </FieldGroup.Value>
    </FieldGroup.Section>
  </FieldGroup>
);

// An item page: Detail with its content, and every kind of read-only value in the Screen's aside.
export function Item() {
  return (
    <Screen title="Fixture item" aside={properties}>
      <Detail markdown="Fixture item content." />
    </Screen>
  );
}
