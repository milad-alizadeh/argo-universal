import { expect, it } from 'vitest';
import { pluginPartVersions } from './plugin-parts';

it('advertises the versions of the parts this App draws', () => {
  expect(pluginPartVersions).toEqual({
    EmptyState: 1,
    List: 1,
    'List.Section': 1,
    ListItem: 2,
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
