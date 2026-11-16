import type { ReactElement } from 'react';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Link } from '#primitives/content/link';
import { FieldGroup } from '#primitives/fields/field-group';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import type { DetailProps } from './detail-props';

export const issue = {
  title: 'Sync fails on large repos',
  detail: {
    markdown:
      'Sync stops after a few minutes on repositories with more than 50,000 files. The Server log shows the fetch timing out.',
  },
  // The Screen's aside, a read-only FieldGroup of the Issue's properties.
  aside: (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value title="Status" value="In progress">
          <StatusDot tone="info" />
        </FieldGroup.Value>
        <FieldGroup.Value title="Assignee">
          <Avatar name="Ana Ruiz" accessibilityLabel="Ana Ruiz" />
        </FieldGroup.Value>
        <FieldGroup.Value title="Labels">
          <Icon name="tag" />
          <Pill text="bug" />
          <Pill text="sync" />
        </FieldGroup.Value>
        <FieldGroup.Value title="Milestone">
          <Icon name="milestone" />
          <Link
            label="v1.2"
            href="https://github.com/milad-alizadeh/argo-universal/milestone/2"
          />
        </FieldGroup.Value>
        <FieldGroup.Value title="Blocked by">
          <Link label="#41" route="/issues/41" />
          <Link label="#57" route="/issues/57" />
        </FieldGroup.Value>
      </FieldGroup.Section>
    </FieldGroup>
  ),
} satisfies { title: string; detail: DetailProps; aside: ReactElement };

export const agent = {
  title: 'Claude Code',
  detail: {
    markdown:
      'Anthropic’s coding Agent, connected through ACP. It reads and edits files in the Project, runs commands, and asks before acting outside it.',
  },
  aside: (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value title="Version" value="2.1.4" />
        <FieldGroup.Value title="Source" value="ACP Registry" />
        <FieldGroup.Value title="Website">
          <Link label="claude.com" href="https://claude.com/claude-code" />
        </FieldGroup.Value>
        <FieldGroup.Value title="Platforms">
          <Pill text="macOS" />
          <Pill text="Linux" />
          <Pill text="Windows" />
        </FieldGroup.Value>
      </FieldGroup.Section>
    </FieldGroup>
  ),
} satisfies { title: string; detail: DetailProps; aside: ReactElement };
