import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
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
  unavailable?: boolean;
}

/*
 * The web draws an icon URL with the browser's own image loader, never fetch. Each URL case serves its
 * SVG from a local blob, so no story waits on the network: a revoked blob is a URL that cannot load.
 */
function svgUrl(xml: string): string {
  return URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
}

function unreachableUrl(): string {
  const url = svgUrl(iconXml);
  URL.revokeObjectURL(url);

  return url;
}

function iconCase({ uri, unavailable = false }: IconCase): Story {
  return {
    args: { agent: { ...agent, icon: uri } },
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
});

export const Base64: Story = iconCase({ uri: base64Icon });

export const Url: Story = iconCase({ uri: svgUrl(iconXml) });

export const Missing: Story = iconCase({ unavailable: true });

export const MalformedEncoding: Story = iconCase({
  uri: 'data:image/svg+xml,%GG',
  unavailable: true,
});

export const MalformedXml: Story = iconCase({
  uri: `data:image/svg+xml,${encodeURIComponent(malformedIconXml)}`,
  unavailable: true,
});

export const UnavailableUrl: Story = iconCase({
  uri: unreachableUrl(),
  unavailable: true,
});

export const MalformedUrlXml: Story = iconCase({
  uri: svgUrl(malformedIconXml),
  unavailable: true,
});
