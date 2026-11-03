import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { MetadataWidthContext } from './metadata-drawing-context';
import {
  type FallbackField,
  FieldLabel,
  IssueMetadata,
  issueFields,
} from './metadata-fallback-fields.mocks';

/*
 * Spec 0026 (#1860) option boards: what Metadata falls back to when its column does not fit. Nothing here is built;
 * the owner picks one. 375 and 768 have no room for the 280 column (the Detail needs 720), so web draws them narrow;
 * 1024 has the column, which every option keeps.
 */
export type FallbackOption = 'stacked' | 'label-column' | 'wrap' | 'beside';

type FieldDrawing = (field: FallbackField) => ReactElement;

// A: the column's own drawing at every width: label over value.
const stacked: FieldDrawing = (field) => (
  <View key={field.title} className="gap-1">
    <FieldLabel title={field.title} />
    {field.value}
  </View>
);

// B: a fixed label column that truncates; the value takes the rest and wraps.
const labelColumn: FieldDrawing = (field) => (
  <View key={field.title} className="flex-row items-start gap-3">
    <View className="h-6 w-24 shrink-0 justify-center">
      <FieldLabel title={field.title} />
    </View>
    <View className="min-h-6 min-w-0 flex-1 justify-center">{field.value}</View>
  </View>
);

// C: today's wrapping line, but a label never shrinks; a value that does not fit wraps under its label.
const wrap: FieldDrawing = (field) => (
  <View
    key={field.title}
    className="min-w-0 max-w-full flex-row flex-wrap items-center gap-1.5"
  >
    <View className="shrink-0">
      <FieldLabel title={field.title} />
    </View>
    <View className="min-w-0 max-w-full">{field.value}</View>
  </View>
);

// D: iOS's own beside drawing (LabeledContent) on the web: label leading, value trailing.
const beside: FieldDrawing = (field) => (
  <View
    key={field.title}
    className="flex-row items-start justify-between gap-3"
  >
    <View className="h-6 shrink-0 justify-center">
      <FieldLabel title={field.title} />
    </View>
    <View className="min-h-6 min-w-0 shrink items-end justify-center">
      {field.value}
    </View>
  </View>
);

const drawings = {
  stacked: { field: stacked, list: 'gap-3' },
  'label-column': { field: labelColumn, list: 'gap-2' },
  wrap: {
    field: wrap,
    list: 'flex-row flex-wrap items-center gap-x-4 gap-y-2',
  },
  beside: { field: beside, list: 'gap-2' },
} satisfies Record<FallbackOption, { field: FieldDrawing; list: string }>;

function Fallback({ option }: { option: FallbackOption }): ReactElement {
  const drawing = drawings[option];

  return <View className={drawing.list}>{issueFields.map(drawing.field)}</View>;
}

// The Metadata's own width at each window: the page less 16 a side at 375 and 32 at 768; the 280 column at 1024.
const windows = [
  { label: '375', width: 343, room: 'narrow' },
  { label: '768', width: 704, room: 'narrow' },
  { label: '1024', width: 280, room: 'column' },
] as const;

type Window = (typeof windows)[number];

interface FrameProps {
  window: Window;
  option?: FallbackOption;
}

function FrameBody({ window, option }: FrameProps): ReactElement {
  const drawn = option && window.room === 'narrow';

  return (
    <MetadataWidthContext value={window.room}>
      {drawn ? <Fallback option={option} /> : <IssueMetadata />}
    </MetadataWidthContext>
  );
}

const WindowFrame = (props: FrameProps): ReactElement => (
  <View className="gap-2">
    <Text role="secondary" tone="muted">
      {`${props.window.label} window · ${props.window.width} wide`}
    </Text>
    <View
      className="rounded-2xl bg-content p-4 shadow-hairline"
      style={{ width: props.window.width + 32 }}
    >
      <FrameBody {...props} />
    </View>
  </View>
);

const frames = (option?: FallbackOption): ReactElement[] =>
  windows.map((window) => (
    <WindowFrame key={window.label} window={window} option={option} />
  ));

// One option at the three windows, side by side; without `option`, today's Metadata.
export const FallbackBoard = (props: {
  title: string;
  option?: FallbackOption;
}): ReactElement => (
  <View className="m-4 gap-3">
    <Text role="heading" aria-level={2}>
      {props.title}
    </Text>
    <View className="flex-row items-start gap-6">{frames(props.option)}</View>
  </View>
);
