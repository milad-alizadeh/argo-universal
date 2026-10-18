import type { PluginComponents } from './index';

export const Text: PluginComponents['Text'];

export const Button: PluginComponents['Button'];

export const Stack: PluginComponents['Stack'];

export const Row: PluginComponents['Row'];

export const Column: PluginComponents['Column'];

export const GroupedListItem: PluginComponents['GroupedListItem'];

export const VirtualList: PluginComponents['VirtualList'];

export const Table: PluginComponents['Table'];

export const GroupedList: PluginComponents['GroupedList'];

export const Svg: PluginComponents['Svg'];

export const List: PluginComponents['List'] & {
  Section: PluginComponents['List.Section'];
};

export const ListSection: PluginComponents['List.Section'];

export const ListItem: PluginComponents['ListItem'] & {
  Link: PluginComponents['ListItem.Link'];
  Toggle: PluginComponents['ListItem.Toggle'];
  Picker: PluginComponents['ListItem.Picker'];
  Stepper: PluginComponents['ListItem.Stepper'];
  TextField: PluginComponents['ListItem.TextField'];
  Button: PluginComponents['ListItem.Button'];
};

export const Label: PluginComponents['Label'];

export const ProgressBar: PluginComponents['ProgressBar'];

export const Pill: PluginComponents['Pill'];

export const EmptyState: PluginComponents['EmptyState'];

export const Picker: PluginComponents['Picker'];

export const Switch: PluginComponents['Switch'];

export const Checkbox: PluginComponents['Checkbox'];

export const Slider: PluginComponents['Slider'];

export const TextInput: PluginComponents['TextInput'];

export const IconButton: PluginComponents['IconButton'];

export const SplitButton: PluginComponents['SplitButton'];

export const ActionList: PluginComponents['ActionList'] & {
  Section: PluginComponents['ActionList.Section'];
};

export const ActionListSection: PluginComponents['ActionList.Section'];

export const Action: PluginComponents['Action'];

export const Page: PluginComponents['Page'];
