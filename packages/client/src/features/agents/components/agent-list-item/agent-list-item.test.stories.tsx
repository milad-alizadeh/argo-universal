import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, spyOn, waitFor } from 'storybook/test';
import {
  agentRow,
  base64Icon,
  encodedIcon,
  iconXml,
  malformedIconXml,
} from '../registry-icons.mocks';
import { AgentListItem } from './agent-list-item';

const agent = { ...agentRow, icon: encodedIcon };

const meta = {
  title: 'Tests/AgentListItem',
  component: AgentListItem,
  args: { agent, onInstall: fn(), onRemove: fn() },
} satisfies Meta<typeof AgentListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

interface IconCase {
  uri?: string;
  response?: string;
  status?: number;
  unavailable?: boolean;
}

function iconCase(options: IconCase): Story {
  const { uri, response, status, unavailable } = {
    response: iconXml,
    status: 200,
    unavailable: false,
    ...options,
  };

  return {
    args: { agent: { ...agent, icon: uri } },
    beforeEach: (): (() => void) => {
      const port = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(response, { status }),
      );

      return (): void => port.mockRestore();
    },
    play: async ({ canvas }): Promise<void> => {
      const present = `${agent.name} icon${unavailable ? ' unavailable' : ''}`;
      const absent = `${agent.name} icon${unavailable ? '' : ' unavailable'}`;
      await waitFor(() =>
        expect(canvas.getByLabelText(present, { exact: true })).toBeVisible(),
      );
      await expect(
        canvas.queryByLabelText(absent, { exact: true }),
      ).not.toBeInTheDocument();
    },
  };
}

export const EncodedWithoutNativeDecoding: Story = iconCase({
  uri: encodedIcon,
  response: encodedIcon.slice(encodedIcon.indexOf(',') + 1),
});

export const Base64: Story = iconCase({ uri: base64Icon });

export const Url: Story = iconCase({ uri: 'https://example.org/icon.svg' });

export const Missing: Story = iconCase({ unavailable: true });

export const MalformedEncoding: Story = iconCase({
  uri: 'data:image/svg+xml,%GG',
  unavailable: true,
});

export const MalformedXml: Story = iconCase({
  uri: `data:image/svg+xml,${encodeURIComponent(malformedIconXml)}`,
  response: malformedIconXml,
  unavailable: true,
});

export const UnavailableUrl: Story = iconCase({
  uri: 'https://example.org/unavailable.svg',
  status: 503,
  unavailable: true,
});

export const MalformedUrlXml: Story = iconCase({
  uri: 'https://example.org/malformed.svg',
  response: malformedIconXml,
  unavailable: true,
});
