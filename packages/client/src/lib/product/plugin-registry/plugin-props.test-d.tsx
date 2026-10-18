/** @jsxImportSource @argo/plugin-kit */

import type * as PluginKit from '@argo/plugin-kit';
import {
  Button,
  List,
  ListItem as PluginListItem,
  Column,
  Row,
  Stack,
  Text,
  GroupedListItem,
  Pill,
  VirtualList,
  Table,
  GroupedList,
  type PluginComponents,
  type PluginProps,
} from '@argo/plugin-kit';
import { expectTypeOf } from 'vitest';

type PublicComponents = Omit<PluginComponents, 'List.Section'> & {
  ListSection: PluginComponents['List.Section'];
};

expectTypeOf<
  Pick<typeof PluginKit, keyof PublicComponents>
>().toExtend<PublicComponents>();

expectTypeOf<typeof PluginKit.List.Section>().toEqualTypeOf<
  PluginComponents['List.Section']
>();

<Stack direction="column" gap={2}>
  <Row>
    <Column>
      <Text variant="heading">Hello</Text>
    </Column>
  </Row>
  <Button label="Tap" onPress={() => {}} />
</Stack>;

<Text label="Hello" accessibilityLabel="Greeting" />;

<Button onPress={{ action: 'toast', message: 'Done' }}>Tap</Button>;

// @ts-expect-error direction is a closed token enum.
<Stack direction="diagonal" />;

// @ts-expect-error labels must be strings.
<Text label={42} />;

// @ts-expect-error style never crosses the Plugin wire.
<Text label="Styled" style={{ color: 'red' }} />;

// @ts-expect-error a Button needs a label or textual children.
<Button />;

// @ts-expect-error gaps use the shared spacing tokens.
<Row gap={7} />;

// @ts-expect-error onPress has no string payload.
<Button label="Tap" onPress={(value: string) => value.toUpperCase()} />;

// @ts-expect-error Plugin JSX contains kit components, never HTML elements.
<div />;

// @ts-expect-error DOM styling cannot bypass the Plugin prop schemas.
<span className="styled" style={{ color: 'red' }} />;

<Pill text="Healthy" tone="success" />;

<VirtualList
  items={[{ id: 'row' }]}
  renderItem={(item) => <Text key={item.id} label={item.id} />}
/>;

<Table>
  <Text key="row" label="Row" />
</Table>;

<GroupedList>
  <GroupedListItem key="row" label="Row" />
</GroupedList>;

const listItems = [{ id: 'row' }] as const;

const stringItem = (item: string): React.JSX.Element => <Text label={item} />;

// @ts-expect-error renderItem receives the type of each item.
<VirtualList items={listItems} renderItem={stringItem} />;

// @ts-expect-error a named slot contains elements, never data objects.
<GroupedListItem label="Bad slot" leading={{ arbitrary: true }} />;

// @ts-expect-error the part declares its named slots in Contracts.
<GroupedListItem label="Unknown slot" invented={<Text label="Content" />} />;

const optional = Boolean('optional');

<GroupedListItem
  label="Conditional"
  accessories={[
    optional && <Text key="optional" label="Optional" />,
    null,
    undefined,
    false,
  ]}
/>;

<VirtualList
  items={listItems}
  renderItem={(item) => <Text key={item.id} label={item.id} />}
/>;

expectTypeOf<PluginProps['VirtualList']>().toHaveProperty('items');

<List
  empty={<Text label="No runs" />}
  items={listItems}
  renderItem={(item) => <PluginListItem key={item.id} title={item.id} />}
/>;
