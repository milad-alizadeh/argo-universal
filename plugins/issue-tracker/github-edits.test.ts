import { expect, it } from 'vitest';
import type { Sent } from './tracker-answering';
import { reply, trackerAnswering } from './tracker-answering';

const calls = (sent: Sent[]): string[] =>
  sent.map(
    ({ url, init }) =>
      `${init?.method} ${url.replace('https://api.github.com/repos/owner/repository', '')}`,
  );

// GitHub answers each of the two lists with an array.
const listReply = (): NonNullable<Parameters<typeof trackerAnswering>[0]> => {
  const text = JSON.stringify([{ name: 'bug', color: 'd73a4a', login: 'ada' }]);

  return {
    ok: true,
    status: 200,
    statusText: '',
    headers: {},
    body: text,
    truncated: false,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve({}),
  };
};

it('reads the repository labels in their own colours, and the people an Issue can be assigned to', async () => {
  const { sent, tracker } = trackerAnswering(listReply());

  const choices = await tracker.choices();

  expect(choices.labels).toEqual([{ name: 'bug', color: '#d73a4a' }]);
  expect(choices.assignees).toEqual(['ada']);
  expect(calls(sent)).toEqual([
    'GET /labels?per_page=100',
    'GET /assignees?per_page=100',
  ]);
});

it.each([
  [{ kind: 'label', name: 'bug', on: true }, ['POST /issues/7/labels']],
  [
    { kind: 'label', name: 'good first', on: false },
    ['DELETE /issues/7/labels/good%20first'],
  ],
  [{ kind: 'assignee', login: 'ada', on: true }, ['POST /issues/7/assignees']],
  [
    { kind: 'assignee', login: 'ada', on: false },
    ['DELETE /issues/7/assignees'],
  ],
  [
    { kind: 'new-label', name: 'needs-design' },
    ['POST /labels', 'POST /issues/7/labels'],
  ],
] as const)(
  'sends %j as the calls GitHub takes for it',
  async (edit, expected) => {
    const { sent, tracker } = trackerAnswering(reply(200, {}));

    await tracker.edit(7, edit);

    expect(calls(sent)).toEqual(expected);
  },
);

it("ends an edit with GitHub's own reason when it refuses", async () => {
  const { sent, tracker } = trackerAnswering(
    reply(422, { message: 'Label already exists.' }),
  );

  await expect(
    tracker.edit(7, { kind: 'new-label', name: 'bug' }),
  ).rejects.toThrow('Label already exists.');
  expect(sent).toHaveLength(1);
});
