import { wireParts, versionsOf } from '@repo/contracts/plugins/kit';

// This App's registry; its renderer table must cover exactly these parts.
export const pluginParts = {
  List: wireParts.List,
  'List.Section': wireParts['List.Section'],
  ListItem: wireParts.ListItem,
  Label: wireParts.Label,
  ProgressBar: wireParts.ProgressBar,
  Pill: wireParts.Pill,
  VirtualList: wireParts.VirtualList,
  GroupedList: wireParts.GroupedList,
  GroupedListItem: wireParts.GroupedListItem,
  Text: wireParts.Text,
  Button: wireParts.Button,
  Stack: wireParts.Stack,
  Row: wireParts.Row,
  Column: wireParts.Column,
} satisfies Partial<typeof wireParts>;

export type PluginPart = keyof typeof pluginParts;

export const pluginPartVersions = versionsOf(Object.keys(pluginParts));
