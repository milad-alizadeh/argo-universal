import {
  recordedAgentMessage,
  streamingAgentMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { AgentMessageProps } from './agent-message';

const markdownAnswer = 'markdown-answer';

export const answeredMessage = {
  row: recordedAgentMessage('agent-1', markdownAnswer),
} satisfies AgentMessageProps;

export const streamingMessage = {
  row: streamingAgentMessage('agent-2', markdownAnswer),
  streaming: true,
} satisfies AgentMessageProps;

const chartData = {
  kind: 'line',
  label: 'Weekly deliveries',
  series: [
    {
      name: 'Delivered',
      tone: 'info',
      points: [
        { x: 1, y: 12 },
        { x: 2, y: 19 },
        { x: 3, y: 26 },
      ],
    },
  ],
};

const openChart =
  'Here are the deliveries by week.\n\n```chart\n' + JSON.stringify(chartData);

function chartMessage(text: string, streaming = false): AgentMessageProps {
  return {
    row: { ...answeredMessage.row, content: [{ type: 'text', text }] },
    streaming,
  };
}

export const chartAnswer = chartMessage(openChart + '\n```');

export const streamingChart = chartMessage(openChart, true);

export const invalidChart = chartMessage('```chart\n{"kind":"histogram"}\n```');
