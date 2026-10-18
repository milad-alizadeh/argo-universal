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
  EmptyState,
  VirtualList,
  Table,
  GroupedList,
  Svg,
  type PluginComponents,
  type PluginProps,
} from '@argo/plugin-kit';
import { emptyStateProps } from '@repo/contracts/plugins/kit';
import { expectTypeOf } from 'vitest';
import type { z } from 'zod';
import type { EmptyStateProps } from '#primitives/status/empty-state';

type NestedPart = Extract<keyof PluginComponents, `${string}.${string}`>;

type PublicComponents = Omit<PluginComponents, NestedPart> & {
  ListSection: PluginComponents['List.Section'];
};

expectTypeOf<
  Pick<typeof PluginKit, keyof PublicComponents>
>().toExtend<PublicComponents>();

expectTypeOf<typeof PluginKit.List.Section>().toEqualTypeOf<
  PluginComponents['List.Section']
>();

expectTypeOf<z.output<typeof emptyStateProps>>().toExtend<EmptyStateProps>();

<Stack direction="column" gap={2}>
  <Row>
    <Column>
      <Text role="body">Hello</Text>
    </Column>
  </Row>
  <Button label="Tap" onPress={() => {}} />
  <Svg xml="<svg/>" label="Service map" tone="info" aspectRatio={1.5} />;
</Stack>;

<Text accessibilityLabel="Greeting">Hello</Text>;

<Button label="Tap" onPress={{ action: 'toast', message: 'Done' }} />;

// @ts-expect-error direction is a closed token enum.
<Stack direction="diagonal" />;

// @ts-expect-error Text children contain text, not arbitrary objects.
<Text>{{ message: 'wrong' }}</Text>;

// @ts-expect-error style never crosses the Plugin wire.
<Text style={{ color: 'red' }}>Styled</Text>;

// @ts-expect-error a Button needs its label.
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
  renderItem={(item) => <Text key={item.id}>{item.id}</Text>}
/>;

<Table>
  <Text key="row">Row</Text>
</Table>;

<GroupedList>
  <GroupedListItem key="row" label="Row" />
</GroupedList>;

const listItems = [{ id: 'row' }] as const;

const stringItem = (item: string): React.JSX.Element => <Text>{item}</Text>;

// @ts-expect-error renderItem receives the type of each item.
<VirtualList items={listItems} renderItem={stringItem} />;

// @ts-expect-error a named slot contains elements, never data objects.
<GroupedListItem label="Bad slot" leading={{ arbitrary: true }} />;

// @ts-expect-error the part declares its named slots in Contracts.
<GroupedListItem label="Unknown slot" invented={<Text>Content</Text>} />;

const optional = Boolean('optional');

<GroupedListItem
  label="Conditional"
  accessories={[
    optional && <Text key="optional">Optional</Text>,
    null,
    undefined,
    false,
  ]}
/>;

<VirtualList
  items={listItems}
  renderItem={(item) => <Text key={item.id}>{item.id}</Text>}
/>;

expectTypeOf<PluginProps['VirtualList']>().toHaveProperty('items');

<EmptyState
  icon="sessions"
  title="No Sessions yet"
  description="Start a Session"
  action={<Button label="New Session" onPress={() => {}} />}
/>;

<List
  empty={<Text>No runs</Text>}
  items={listItems}
  renderItem={(item) => <PluginListItem key={item.id} title={item.id} />}
/>;

// @ts-expect-error Text uses role, with no variant alias.
<Text variant="heading">Heading</Text>;

// @ts-expect-error Text uses children, with no label alias.
<Text label="Old content" />;

<Text role={{ compact: 'body', wide: 'heading' }}>Responsive</Text>;
