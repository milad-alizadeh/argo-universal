import type { ReactElement } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import type { DetailProps } from './detail-props';

// A row that opens a page; the stories open nothing.
const noop = (): void => {};

export const issue = {
  title: 'Sync fails on large repos',
  detail: {
    markdown:
      'Sync stops after a few minutes on repositories with more than 50,000 files. The Server log shows the fetch timing out.',
  },
  // The Screen's aside: the Issue's properties as Settings rows.
  aside: (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value title="Status" value="In progress" dot="info" />
        <FieldGroup.Value title="Assignee" value="Ana Ruiz" />
        <FieldGroup.Value title="Labels" value="bug, sync" />
        <FieldGroup.Link title="Milestone" value="v1.2" onPress={noop} />
        <FieldGroup.Value title="Blocked by" value="#41, #57" />
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
        <FieldGroup.Link title="Website" value="claude.com" onPress={noop} />
        <FieldGroup.Value title="Platforms" value="macOS, Linux, Windows" />
      </FieldGroup.Section>
    </FieldGroup>
  ),
} satisfies { title: string; detail: DetailProps; aside: ReactElement };
