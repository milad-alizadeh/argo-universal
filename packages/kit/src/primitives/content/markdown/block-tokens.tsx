import type { Token, Tokens } from 'marked';
import {
  type ComponentType,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#kit/markdown-marks';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { keyedBlocks, keyedTokens } from './block-keys';
import { Caret } from './caret';
import { useClampText } from './clamp-leaves';
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
import { type BlockTokenProps, byType } from './markdown-tokens';
import { MarkdownTone } from './markdown-tone';
import { TableToken } from './table-token';

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

  return keyedTokens(list.items, () => 'item').map(({ token, key }, index) => ({
    key,
    marker: listMarker(list, index),
    tokens: token.tokens,
    caret: caret && index === last,
  }));
}

function ListMarker({ children }: { children: string }): ReactElement {
  const tone = useContext(MarkdownTone);
  const clampText = useClampText('body');

  return (
    <Text
      {...clampText}
      role="body"
      tone={tone}
      className="min-w-4 shrink-0 font-sans text-muted-foreground"
    >
      {children}
    </Text>
  );
}

function ListItem({ marker, tokens, caret }: ListItemProps): ReactElement {
  return (
    <View className="flex-row w-full gap-2">
      <ListMarker>{marker}</ListMarker>
      <View className="w-0 min-w-0 flex-1 gap-1">
        <Blocks tokens={tokens} caret={caret} />
      </View>
    </View>
  );
}

function ListToken({
  token,
  caret,
}: BlockTokenProps<Tokens.List>): ReactElement {
  return (
    <View className="gap-1">
      {listItems(token, caret).map(({ key, ...item }) => (
        <ListItem key={key} {...item} />
      ))}
    </View>
  );
}

function BlockquoteToken({
  token,
  caret,
}: BlockTokenProps<Tokens.Blockquote>): ReactElement {
  return (
    <View className={cn('gap-2.5', markdownBlockClassNames.quote)}>
      <Blocks tokens={token.tokens} caret={caret} />
    </View>
  );
}

const blockTokens = new Map<string, ComponentType<BlockTokenProps>>([
  byType('heading', HeadingToken),
  byType('paragraph', ParagraphToken),
  byType('text', TextToken),
  byType('html', HtmlToken),
  byType('def', DefToken),
  byType('hr', HrToken),
  byType('list', ListToken),
  byType('code', CodeToken),
  byType('table', TableToken),
  byType('blockquote', BlockquoteToken),
]);

function Block({ token, caret }: BlockTokenProps): ReactElement {
  return createElement(blockTokens.get(token.type) ?? OtherToken, {
    token,
    caret,
  });
}

export function Blocks({ tokens, caret }: BlocksProps): ReactNode[] {
  const blocks = keyedBlocks(tokens);

  if (caret && blocks.length === 0) return [<Caret key="caret" />];
  const last = blocks.length - 1;

  return blocks.map(({ token, key }, index) => (
    <Block key={key} token={token} caret={caret && index === last} />
  ));
}
