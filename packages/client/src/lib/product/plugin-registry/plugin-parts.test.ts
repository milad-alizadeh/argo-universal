import { expect, it } from 'vitest';
import { pluginPartVersions } from './plugin-parts';

it('advertises the versions of the parts this App draws', () => {
  expect(pluginPartVersions).toEqual({
    EmptyState: 1,
    Picker: 3,
    Switch: 3,
    Checkbox: 3,
    Slider: 3,
    TextInput: 3,
    IconButton: 2,
    SplitButton: 3,
    List: 2,
    'List.Section': 2,
    'ListItem.Link': 1,
    'ListItem.Toggle': 1,
    'ListItem.Picker': 1,
    'ListItem.Stepper': 1,
    'ListItem.TextField': 1,
    'ListItem.Button': 1,
    ListItem: 3,
    Label: 2,
    ProgressBar: 1,
    Pill: 2,
    VirtualList: 1,
    GroupedList: 1,
    GroupedListItem: 1,
    Text: 3,
    Button: 2,
    Stack: 1,
    Row: 1,
    Column: 1,
    Svg: 1,
  });
});
