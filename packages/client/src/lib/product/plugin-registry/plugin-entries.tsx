import type { ComponentType } from 'react';
import { ActionList, Action } from '#primitives/actions/action-list';
import { Button } from '#primitives/actions/button';
import { IconButton } from '#primitives/actions/icon-button';
import { SplitButton } from '#primitives/actions/split-button';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { Checkbox } from '#primitives/inputs/checkbox';
import { Picker } from '#primitives/inputs/picker';
import { Slider } from '#primitives/inputs/slider';
import { Switch } from '#primitives/inputs/switch';
import { TextInput } from '#primitives/inputs/text-input';
import type { KitProps } from '#primitives/kit-props';
import { Stack } from '#primitives/layout/stack';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Page } from '#primitives/scaffolds/page';
import { EmptyState } from '#primitives/status/empty-state';
import { Pill } from '#primitives/status/pill';
import { ProgressBar } from '#primitives/status/progress-bar';
import { Svg } from '#primitives/visual';
import type { PluginPart } from './plugin-parts';

export const pluginEntries = {
  Page,
  ActionList,
  'ActionList.Section': ActionList.Section,
  Action,
  EmptyState,
  Picker,
  Switch,
  Checkbox,
  Slider,
  TextInput,
  IconButton,
  SplitButton,
  List,
  'List.Section': ListSection,
  'ListItem.Link': ListItem.Link,
  'ListItem.Button': ListItem.Button,
  'ListItem.Toggle': ListItem.Toggle,
  'ListItem.Picker': ListItem.Picker,
  'ListItem.Stepper': ListItem.Stepper,
  'ListItem.TextField': ListItem.TextField,
  ListItem,
  Label,
  ProgressBar,
  Pill,
  Text,
  Button,
  Stack,
  Svg,
} satisfies {
  [Name in PluginPart]: ComponentType<
    KitProps<Name, string, React.JSX.Element>
  >;
};
