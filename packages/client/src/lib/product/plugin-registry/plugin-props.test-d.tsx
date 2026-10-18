/** @jsxImportSource @argo/plugin-kit */
import type * as PluginKit from '@argo/plugin-kit';
import {
  Button,
  Column,
  Row,
  Stack,
  Text,
  GroupedListItem,
  VirtualList,
  Table,
  GroupedList,
  type PluginComponents,
  type PluginProps,
} from '@argo/plugin-kit';
import type { WirePart, WireProps } from '@repo/contracts/plugins/kit';
import { expectTypeOf } from 'vitest';
import type { ButtonProps } from '#primitives/actions/button';
import type { TextProps, TextRole } from '#primitives/content/text';
import type { StackProps } from '#primitives/layout/stack';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';

expectTypeOf<Pick<typeof PluginKit, WirePart>>().toExtend<PluginComponents>();

expectTypeOf<
  Omit<Extract<PluginProps['Text'], { label: string }>, 'children'>
>().toEqualTypeOf<WireProps['Text']>();

expectTypeOf<WireProps['Stack']>().toEqualTypeOf<
  Omit<StackProps, 'children'>
>();

type Flat<Props> = { [Key in keyof Props]: Props[Key] };

expectTypeOf<Flat<PluginProps['Stack']>>().toEqualTypeOf<StackProps>();

expectTypeOf<Flat<PluginProps['Row']>>().toEqualTypeOf<
  Omit<StackProps, 'direction'>
>();

expectTypeOf<PluginProps['Column']>().toEqualTypeOf<PluginProps['Row']>();

expectTypeOf<WireProps['Text']['variant']>().toEqualTypeOf<
  TextRole | undefined
>();

expectTypeOf<WireProps['Text']['tone']>().toEqualTypeOf<TextProps['tone']>();

expectTypeOf<WireProps['Text']['accessibilityLabel']>().toEqualTypeOf<
  TextProps['accessibilityLabel']
>();

expectTypeOf<Omit<WireProps['Button'], 'onPress'>>().toEqualTypeOf<
  Pick<ButtonProps, 'label' | 'variant' | 'tone' | 'size' | 'disabled'>
>();

expectTypeOf<PluginProps['Button']['onPress']>().toExtend<
  WireProps['Button']['onPress'] | ButtonProps['onPress']
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

expectTypeOf<Omit<WireProps['GroupedListItem'], 'onPress'>>().toExtend<
  Pick<GroupedListItemProps, 'label' | 'value' | 'disabled'>
>();

expectTypeOf<NonNullable<PluginProps['GroupedListItem']['leading']>>().toExtend<
  | React.ReactElement
  | boolean
  | readonly (React.ReactElement | boolean | null | undefined)[]
>();

<GroupedListItem
  label="Slotted"
  leading={[<Text key="a" label="First" />, <Text key="b" label="Second" />]}
  onPress={() => {}}
/>;

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
