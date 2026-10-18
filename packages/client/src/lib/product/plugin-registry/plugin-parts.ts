import { wireParts, versionsOf } from '@repo/contracts/plugins/kit';

// This App's registry; its renderer table must cover exactly these parts.
export const pluginParts = {
  GroupedListItem: wireParts.GroupedListItem,
  Text: wireParts.Text,
  Button: wireParts.Button,
  Stack: wireParts.Stack,
  Row: wireParts.Row,
  Column: wireParts.Column,
} satisfies Partial<typeof wireParts>;

export type PluginPart = keyof typeof pluginParts;

export const pluginPartVersions = versionsOf(Object.keys(pluginParts));
