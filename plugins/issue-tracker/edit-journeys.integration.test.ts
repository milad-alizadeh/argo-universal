import { findWireNodeEntry, type WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { issueTitle, openIssue } from './journey-fixture';

const pickerTitled =
  (title: string) =>
  (node: WireNode): boolean =>
    node.type === 'FieldGroup.Picker' && node.props.title === title;

type Page = Awaited<ReturnType<typeof openIssue>>;

// The Operation a picker's event runs, by the picker's title.
const runBy = (
  page: Page,
  title: string,
  event: string,
): WireNode['props'][string] | undefined =>
  findWireNodeEntry(page.tree, pickerTitled(title))?.node.props[event];

it("edits the Issue's status, labels and assignees from the Properties as Operations", async () => {
  const page = await openIssue(issueTitle);

  expect(runBy(page, 'Status', 'onValueChange')).toMatchObject({
    operation: 'setStatus',
  });
  expect(runBy(page, 'Labels', 'onToggle')).toMatchObject({
    operation: 'setLabel',
  });
  expect(runBy(page, 'Labels', 'onCreate')).toMatchObject({
    operation: 'createLabel',
  });
  expect(runBy(page, 'Assignees', 'onToggle')).toMatchObject({
    operation: 'setAssignee',
  });
}, 20_000);
