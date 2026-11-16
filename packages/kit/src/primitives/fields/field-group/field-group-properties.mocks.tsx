import type { ReactElement } from 'react';
import { Avatar } from '#primitives/content/avatar';
import { Label } from '#primitives/content/label';
import { Link } from '#primitives/content/link';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import { FieldGroup } from './field-group';

const onePixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMon7IWAAM+Abm7LakRAAAAAElFTkSuQmCC';

// Every kind of read-only value: words, an icon before them, Pills, a status, a Link and people.
export const rows: ReactElement[] = [
  <FieldGroup.Value key="branch" title="Branch" value="main" />,
  <FieldGroup.Value key="device" title="Device">
    <Label text="Milad’s MacBook Pro" icon="computer" />
  </FieldGroup.Value>,
  <FieldGroup.Value
    key="path"
    title="Path"
    value="~/Developer/argo-universal"
  />,
  <FieldGroup.Value key="labels" title="Labels">
    <Pill text="bug" />
    <Pill text="area/sync" />
    <Pill text="good first issue" />
    <Pill text="desktop" />
    <Pill text="needs-review" />
    <Pill text="p2" />
  </FieldGroup.Value>,
  <FieldGroup.Value key="platforms" title="Platforms">
    <Pill text="iOS" />
    <Pill text="Android" />
    <Pill text="Web" />
  </FieldGroup.Value>,
  <FieldGroup.Value key="status" title="Status" value="In progress">
    <StatusDot tone="info" />
  </FieldGroup.Value>,
  <FieldGroup.Value key="checks" title="Checks" value="Passed">
    <StatusDot tone="success" />
  </FieldGroup.Value>,
  <FieldGroup.Value key="link" title="Repository">
    <Link
      label="argo-universal"
      href="https://github.com/milad-alizadeh/argo-universal"
    />
  </FieldGroup.Value>,
  <FieldGroup.Value key="avatar" title="Assignee">
    <Avatar name="Milad Alizadeh" accessibilityLabel="Milad Alizadeh" />
  </FieldGroup.Value>,
  <FieldGroup.Value key="image" title="Reviewer">
    <Avatar
      name="Alex Chen"
      accessibilityLabel="Alex Chen"
      source={{ uri: onePixel }}
    />
  </FieldGroup.Value>,
];

// A Section of the given rows, as a FieldGroup's child.
export function section(
  children: ReactElement | ReactElement[],
  title?: string,
): ReactElement {
  return <FieldGroup.Section title={title}>{children}</FieldGroup.Section>;
}
