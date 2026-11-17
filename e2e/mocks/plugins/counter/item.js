import { Detail, FieldGroup, Screen } from '@argo/plugin-kit';

const properties = (
  <FieldGroup>
    <FieldGroup.Section>
      <FieldGroup.Value title="Status" value="Open" dot="info" />
      <FieldGroup.Value title="Assignee" value="Ana Ruiz" />
      <FieldGroup.Value title="Labels" value="fixture" />
      <FieldGroup.Value title="Opened" value="Today" />
      <FieldGroup.Value title="Docs" value="example.com" />
    </FieldGroup.Section>
  </FieldGroup>
);

// An item page: Detail with its content, and its properties as FieldGroup rows in the Screen's aside.
export function Item() {
  return (
    <Screen title="Fixture item" aside={properties}>
      <Detail markdown="Fixture item content." />
    </Screen>
  );
}
