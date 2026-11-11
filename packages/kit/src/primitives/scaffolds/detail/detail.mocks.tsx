import type { ReactElement } from 'react';
import { Metadata } from '#primitives/scaffolds/metadata';
import { Pill } from '#primitives/status/pill';
import type { DetailProps } from './detail-props';

export const issue = {
  title: 'Sync fails on large repos',
  detail: {
    markdown:
      'Sync stops after a few minutes on repositories with more than 50,000 files. The Server log shows the fetch timing out.',
  },
  // The Screen's aside, which holds the Detail's Metadata.
  aside: (
    <Metadata>
      <Metadata.StatusDot title="Status" text="In progress" tone="info" />
      <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
      <Metadata.Pills title="Labels" icon="tag">
        <Pill text="bug" />
        <Pill text="sync" />
      </Metadata.Pills>
      <Metadata.Link
        title="Milestone"
        text="v1.2"
        icon="milestone"
        href="https://github.com/milad-alizadeh/argo-universal/milestone/2"
      />
      <Metadata.Link title="Blocked by" text="#41" href="/issues/41" />
      <Metadata.Link title="Blocked by" text="#57" href="/issues/57" />
    </Metadata>
  ),
} satisfies { title: string; detail: DetailProps; aside: ReactElement };

export const agent = {
  title: 'Claude Code',
  detail: {
    markdown:
      'Anthropic’s coding Agent, connected through ACP. It reads and edits files in the Project, runs commands, and asks before acting outside it.',
  },
  aside: (
    <Metadata>
      <Metadata.Label title="Version" text="2.1.4" />
      <Metadata.Label title="Source" text="ACP Registry" />
      <Metadata.Link
        title="Website"
        text="claude.com"
        href="https://claude.com/claude-code"
      />
      <Metadata.Pills title="Platforms">
        <Pill text="macOS" />
        <Pill text="Linux" />
        <Pill text="Windows" />
      </Metadata.Pills>
    </Metadata>
  ),
} satisfies { title: string; detail: DetailProps; aside: ReactElement };
