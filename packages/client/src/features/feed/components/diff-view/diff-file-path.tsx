import { Text, TextClassContext } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { use, useEffectEvent, useLayoutEffect, useRef } from 'react';
import { Platform, View, type ViewInstance } from 'react-native';
import { ScrollFadeView } from '#lib/product/scroll-fade/scroll-fade';

// On web the folder keeps left-to-right order inside the right-to-left text that ellipsizes its start.
const isolated = (folder: string): string =>
  Platform.OS === 'web' ? `\u2066${folder}\u2069` : folder;

const folderText = {
  selectable: false,
  numberOfLines: 1,
  ellipsizeMode: 'head',
  role: 'code',
  tone: 'muted',
} as const;

// The web's Text sets its own direction, so the right-to-left box is set on the Text itself.
const headFirst = 'web:[direction:rtl] web:text-left';

// A narrow header gives up the folder's start, so what stays is the part beside the name.
function FolderName({ folder }: { folder: string }): React.JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <TextClassContext value={cn(use(TextClassContext), headFirst)}>
        <Text {...folderText}>{isolated(folder)}</Text>
      </TextClassContext>
    </View>
  );
}

function FileBaseName({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="max-w-full shrink-0">
      <Text selectable={false} numberOfLines={1} role="code">
        {name}
      </Text>
    </View>
  );
}

interface PathParts {
  folder: string;
  name: string;
}

const splitPath = (path: string): PathParts => {
  const slash = path.lastIndexOf('/');

  return { folder: path.slice(0, slash + 1), name: path.slice(slash + 1) };
};

// On web a View is its DOM element.
const domNode = (view: ViewInstance | null): Element | undefined => {
  const node: unknown = view;

  return Platform.OS === 'web' && node instanceof Element ? node : undefined;
};

// A line cut short holds more than its box shows; each part of the path is one box around one line.
const cutShort = (row: Element): boolean =>
  [...row.children].some(
    ({ firstElementChild: line }) =>
      line !== null && line.scrollWidth > line.clientWidth,
  );

interface CutShortWatch {
  ref: React.RefObject<ViewInstance | null>;
  onLayout: () => void;
}

// Reports, on web, whether the path is cut short each time its row changes width or draws another path.
function useCutShort(
  path: string,
  onCutShortChange?: (cut: boolean) => void,
): CutShortWatch {
  const row = useRef<ViewInstance>(null);
  const onLayout = (): void => report(row.current, onCutShortChange);
  const measure = useEffectEvent(onLayout);

  // A recycled row keeps its width, so a new path is measured on its own.
  useLayoutEffect(() => measure(), [path]);

  return { ref: row, onLayout };
}

function report(
  view: ViewInstance | null,
  onCutShortChange?: (cut: boolean) => void,
): void {
  const node = domNode(view);

  if (node) onCutShortChange?.(cutShort(node));
}

interface FilePathProps {
  path: string;
  // Desktop: told whether the row cuts the path short, so the whole path can show elsewhere.
  onCutShortChange?: (cut: boolean) => void;
}

// The path starts beside its chevron; a long folder gives up its start, never the file name.
export function FilePath(props: FilePathProps): React.JSX.Element {
  const { folder, name } = splitPath(props.path);

  return (
    <View
      {...useCutShort(props.path, props.onCutShortChange)}
      className="min-w-0 flex-1 flex-row items-center"
    >
      <FolderName folder={folder} />
      <FileBaseName name={name} />
    </View>
  );
}

function WholePath({ folder, name }: PathParts): React.JSX.Element {
  return (
    <>
      <Text selectable={false} role="code" tone="muted">
        {folder}
      </Text>
      <Text selectable={false} role="code">
        {name}
      </Text>
    </>
  );
}

// The phone keeps the whole path on its line and scrolls it sideways when it is longer than the row.
export function ScrollingFilePath(props: { path: string }): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-1"
    >
      <WholePath {...splitPath(props.path)} />
    </ScrollFadeView>
  );
}
