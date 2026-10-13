import type { Token, Tokens } from 'marked';
import {
  type ComponentType,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import { Caret } from './caret';
import { useClampLeaf, useLineHeight } from './clamp-leaves';
import {
  CodeToken,
  DefToken,
  HeadingToken,
  HrToken,
  HtmlToken,
  OtherToken,
  ParagraphToken,
  TextToken,
} from './leaf-block-tokens';
import { type BlockTokenProps, isToken } from './markdown-tokens';
import { MarkdownVariant, type MarkdownVariantName } from './markdown-variant';
import { TableToken } from './table-token';

const listGaps: Record<MarkdownVariantName, string> = {
  feed: 'gap-1',
  proposal: 'gap-2',
  summary: 'gap-1',
};

interface ListItemProps {
  marker: string;
  tokens: Token[];
  caret: boolean;
}

interface BlocksProps {
  tokens: Token[];
  caret: boolean;
}

function listMarker(list: Tokens.List, index: number): string {
  const start = typeof list.start === 'number' ? list.start : 1;
  return list.ordered ? `${start + index}.` : '•';
}

function listItems(
  list: Tokens.List,
  caret: boolean,
): (ListItemProps & { key: string })[] {
  const last = list.items.length - 1;
  return withOccurrenceKeys(list.items, (item) => item.raw).map(
    ({ item, key }, index) => ({
      key,
      marker: listMarker(list, index),
      tokens: item.tokens,
      caret: caret && index === last,
    }),
  );
}

function markerClassName(variant: MarkdownVariantName): string {
  return cn(
    'w-4 shrink-0 font-sans',
    variant !== 'proposal' && markdownBlockClassNames.listMarker,
  );
}

function ListMarker({ children }: { children: string }): ReactElement {
  const variant = useContext(MarkdownVariant);
  const leaf = useClampLeaf(useLineHeight('body'));
  return (
    <Text ref={leaf} role="body" className={markerClassName(variant)}>
      {children}
    </Text>
  );
}

function ListItem({ marker, tokens, caret }: ListItemProps): ReactElement {
  return (
    <View className="flex-row gap-2">
      <ListMarker>{marker}</ListMarker>
      <View className="min-w-0 flex-1 gap-1">
        <Blocks tokens={tokens} caret={caret} />
      </View>
    </View>
  );
}

function ListToken({ token, caret }: BlockTokenProps): ReactElement | null {
  const variant = useContext(MarkdownVariant);
  if (!isToken(token, 'list')) return null;
  return (
    <View className={listGaps[variant]}>
      {listItems(token, caret).map(({ key, ...item }) => (
        <ListItem key={key} {...item} />
      ))}
    </View>
  );
}

function BlockquoteToken({
  token,
  caret,
}: BlockTokenProps): ReactElement | null {
  return isToken(token, 'blockquote') ? (
    <View className={cn('gap-2.5', markdownBlockClassNames.quote)}>
      <Blocks tokens={token.tokens} caret={caret} />
    </View>
  ) : null;
}

const blockTokens = new Map<string, ComponentType<BlockTokenProps>>([
  ['heading', HeadingToken],
  ['paragraph', ParagraphToken],
  ['text', TextToken],
  ['html', HtmlToken],
  ['def', DefToken],
  ['hr', HrToken],
  ['list', ListToken],
  ['code', CodeToken],
  ['table', TableToken],
  ['blockquote', BlockquoteToken],
]);

function Block({ token, caret }: BlockTokenProps): ReactElement {
  return createElement(blockTokens.get(token.type) ?? OtherToken, {
    token,
    caret,
  });
}

export function Blocks({ tokens, caret }: BlocksProps): ReactNode[] {
  const blocks = tokens.filter((token) => token.type !== 'space');
  if (caret && blocks.length === 0) return [<Caret key="caret" />];
  const last = blocks.length - 1;
  return withOccurrenceKeys(blocks, (token) => token.raw).map(
    ({ item: token, key }, index) => (
      <Block key={key} token={token} caret={caret && index === last} />
    ),
  );
}
