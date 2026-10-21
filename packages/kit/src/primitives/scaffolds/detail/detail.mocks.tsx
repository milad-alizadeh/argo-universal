import { Metadata } from '#primitives/scaffolds/metadata';
import { Pill } from '#primitives/status/pill';
import type { DetailProps } from './detail-props';

export const issue = {
  title: 'Sync fails on large repos',
  detail: {
    markdown:
      'Sync stops after a few minutes on repositories with more than 50,000 files. The Server log shows the fetch timing out.',
    metadata: (
      <Metadata>
        <Metadata.StatusDot title="Status" text="In progress" tone="info" />
        <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
        <Metadata.Pills title="Labels">
          <Pill text="bug" />
          <Pill text="sync" />
        </Metadata.Pills>
        <Metadata.Link
          title="Milestone"
          text="v1.2"
          href="https://github.com/milad-alizadeh/argo-universal/milestone/2"
        />
      </Metadata>
    ),
  },
} satisfies { title: string; detail: DetailProps };

export const agent = {
  title: 'Claude Code',
  detail: {
    markdown:
      'Anthropic’s coding Agent, connected through ACP. It reads and edits files in the Project, runs commands, and asks before acting outside it.',
    metadata: (
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
  },
} satisfies { title: string; detail: DetailProps };
