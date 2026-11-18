import type { SessionUpdate } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { keepUnchangedItems } from '../../view/keep-unchanged-items';
import { toFeedView } from '../../view/to-feed-view';
import { liveHeaderNow, workingHeader } from '../live-header/live-header.mocks';
import { endings, stoppedTurn } from '../turn-end/turn-end.mocks';
import { Feed } from './feed';
import { longSnapshot, longTail } from './feed.mocks';
import { feedArgs } from './paged-feed.mocks';

const meta = {
  title: 'Feed/FeedStreamingReplay',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const history = longTail.slice(-8);

const last = history.at(-1);

if (!last) throw new Error('Recorded catalog needs Feed history');

const position = last.position;

const revision = longSnapshot.maxRevision;

const recording = 'edit-and-command';

const agent = recordedAgentMessage('agent-1', recording);

const user = recordedUserMessage('agent-1', recording);

function prompt(offset: number, text: string): SessionUpdate {
  return {
    ...user,
    id: `replay-prompt-${offset}`,
    position: position + offset,
    revision: revision + offset,
    content: [{ type: 'text', text }],
  };
}

function answer(
  offset: number,
  text: string,
  state: 'open' | 'settled',
): SessionUpdate {
  return {
    ...agent,
    id: `replay-answer-${offset}`,
    position: position + offset,
    revision: revision + offset,
    state,
    content: [{ type: 'text', text }],
  };
}

const firstPrompt = prompt(1, 'How should we check the release?');

const nextPrompt = prompt(3, 'Can you check the release status?');

const failure = {
  ...stoppedTurn.row,
  id: 'replay-error',
  position: position + 5,
  revision: revision + 5,
  _meta: { argo: { turnEnd: endings.error } },
};

// Irregular chunks split a word and both an opening and a closing Markdown marker.
const chunks = [
  [430, 'Fixed lead.'],
  [65, ' Stay sharp.'],
  [95, ' Keep off'],
  [240, 'ice hours short and leave enough time to run the release checks.'],
  [220, '\n\n**'],
  [140, 'Check the build'],
  [70, ' on iOS and web*'],
  [170, '* before tagging it.'],
  [180, '\n\n1. Run the final tests.'],
  [210, '\n2. Confirm the release status.'],
  [250, '\n\nThe release is ready when both checks pass.'],
] as const;

const answers = chunks.map((_chunk, index) =>
  chunks
    .slice(0, index + 1)
    .map(([, text]) => text)
    .join(''),
);

const completed = [firstPrompt, answer(2, answers.at(-1) ?? '', 'settled')];

interface Step {
  wait: number;
  rows: SessionUpdate[];
  running: boolean;
}

const steps: Step[] = [
  { wait: 0, rows: [], running: false },
  { wait: 1200, rows: [firstPrompt], running: true },
  ...chunks.map(([wait], index) => ({
    wait,
    rows: [firstPrompt, answer(2, answers[index] ?? '', 'open')],
    running: true,
  })),
  { wait: 240, rows: completed, running: false },
  { wait: 1800, rows: [...completed, nextPrompt], running: true },
  {
    wait: 460,
    rows: [...completed, nextPrompt, answer(4, 'Checking the status.', 'open')],
    running: true,
  },
  {
    wait: 650,
    rows: [
      ...completed,
      nextPrompt,
      answer(4, 'Checking the status.', 'settled'),
      failure,
    ],
    running: false,
  },
];

function StreamingFeed(): React.JSX.Element {
  const [drawing, setDrawing] = useState(() => ({
    index: 0,
    view: toFeedView(history, longSnapshot),
  }));

  const { index, view } = drawing;
  const next = steps[index + 1];

  useEffect(() => {
    if (!next) return;

    const timer = setTimeout(() => {
      setDrawing({
        index: index + 1,
        view: keepUnchangedItems(
          view,
          toFeedView([...history, ...next.rows], longSnapshot),
        ),
      });
    }, next.wait);

    return (): void => clearTimeout(timer);
  }, [index, next, view]);

  return (
    <Feed
      {...feedArgs}
      items={view.items}
      liveHeader={steps[index]?.running ? workingHeader : null}
      now={liveHeaderNow}
    />
  );
}

export const StreamingReplay: Story = { render: () => <StreamingFeed /> };
