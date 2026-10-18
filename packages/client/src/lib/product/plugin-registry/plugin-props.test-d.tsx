/** @jsxImportSource @argo/plugin-kit */
import type * as PluginKit from '@argo/plugin-kit';
import {
  Button,
  Column,
  Row,
  Stack,
  Text,
  type PluginComponents,
  type PluginProps,
} from '@argo/plugin-kit';
import type { WirePart, WireProps } from '@repo/contracts/plugins/kit';
import { expectTypeOf } from 'vitest';
import type { ButtonProps } from '#primitives/actions/button';
import type { TextProps, TextRole } from '#primitives/content/text';
import type { StackProps } from '#primitives/layout/stack';

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
