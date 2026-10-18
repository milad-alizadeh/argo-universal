import { Pill } from '#primitives/status/pill';
import { Metadata } from './metadata';
import type { MetadataProps } from './metadata-props';

export const fields: MetadataProps = {
  children: [
    <Metadata.Label key="branch" title="Branch" text="main" />,
    <Metadata.Label
      key="device"
      title="Device"
      text="Milad’s MacBook Pro"
      icon="computer"
    />,
    <Metadata.Label
      key="path"
      title="Path"
      text="~/Developer/argo-universal"
    />,
    <Metadata.Pills key="labels" title="Labels">
      <Pill text="bug" />
      <Pill text="area/sync" />
      <Pill text="good first issue" />
      <Pill text="desktop" />
      <Pill text="needs-review" />
      <Pill text="p2" />
    </Metadata.Pills>,
    <Metadata.Pills key="platforms" title="Platforms">
      <Pill text="iOS" />
      <Pill text="Android" />
      <Pill text="Web" />
    </Metadata.Pills>,
    <Metadata.StatusDot
      key="status"
      title="Status"
      text="In progress"
      tone="info"
    />,
    <Metadata.StatusDot
      key="checks"
      title="Checks"
      text="Passed"
      tone="success"
    />,
    <Metadata.Link
      key="link"
      title="Repository"
      text="argo-universal"
      href="https://github.com/milad-alizadeh/argo-universal"
    />,
    <Metadata.Avatar key="avatar" title="Assignee" name="Milad Alizadeh" />,
    <Metadata.Avatar
      key="image"
      title="Reviewer"
      name="Alex Chen"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMon7IWAAM+Abm7LakRAAAAAElFTkSuQmCC"
    />,
  ],
};
