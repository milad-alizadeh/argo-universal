import { lexer, type Token, type Tokens } from 'marked';
import {
  createContext,
  Fragment,
  memo,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import { Linking, ScrollView, Text as Span, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { FeedCodeBlock } from './FeedCodeBlock';

export interface FeedMarkdownProps {
  text: string;
  // An open row ends its text with a caret.
  streaming?: boolean;
  variant?: 'feed' | 'proposal';
}

const MarkdownVariant = createContext<'feed' | 'proposal'>('feed');

export const inlineCodeClassName =
  'rounded-sm bg-foreground/5 px-1.5 py-px font-mono text-xs leading-4.5 text-foreground';

function Caret() {
  return (
    <View
      testID="streaming-caret"
      className="ml-0.5 h-4 w-0.5 rounded-[1px] bg-foreground"
    />
  );
}

// Inline spans are plain native Text so they inherit the size of the block around them.
function InlineTokens({
  tokens,
  codeClassName = inlineCodeClassName,
}: {
  tokens: Token[] | undefined;
  codeClassName?: string;
}) {
  const { color: linkUnderline } = useResolveClassNames('text-ring');
  return tokens?.map((token, index) => {
    const key = `${token.type}-${index}`;
    switch (token.type) {
      case 'codespan':
        return (
          <Span key={key} className={codeClassName}>
            {token.text}
          </Span>
        );
      case 'strong':
        return (
          <Span key={key} className="font-semibold">
            <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
          </Span>
        );
      case 'em':
        return (
          <Span key={key} className="italic">
            <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
          </Span>
        );
      case 'del':
        return (
          <Span key={key} className="line-through">
            <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
          </Span>
        );
      case 'link':
        return (
          <Span
            key={key}
            role="link"
            className="underline underline-offset-2"
            style={{ textDecorationColor: linkUnderline }}
            onPress={() => Linking.openURL(token.href)}
          >
            <InlineTokens tokens={token.tokens} codeClassName={codeClassName} />
          </Span>
        );
      case 'br':
        return '\n';
      case 'text':
        return token.tokens ? (
          <InlineTokens
            key={key}
            tokens={token.tokens}
            codeClassName={codeClassName}
          />
        ) : (
          <Fragment key={key}>{token.text}</Fragment>
        );
      default:
        return 'text' in token ? (
          <Fragment key={key}>{String(token.text)}</Fragment>
        ) : null;
    }
  });
}

const proposalInlineCodeClassName = cn(
  inlineCodeClassName,
  'text-sm leading-5',
);

const proseClassName = 'font-sans text-sm leading-5.5 text-foreground';

function Prose({
  tokens,
  caret,
  className,
}: {
  tokens: Token[] | undefined;
  caret: boolean;
  className?: string;
}) {
  const variant = useContext(MarkdownVariant);
  return (
    <Text
      className={cn(
        proseClassName,
        variant === 'proposal' && 'leading-5',
        className,
      )}
    >
      <InlineTokens
        tokens={tokens}
        codeClassName={
          variant === 'proposal'
            ? proposalInlineCodeClassName
            : inlineCodeClassName
        }
      />
      {caret && <Caret />}
    </Text>
  );
}

function List({ token, caret }: { token: Tokens.List; caret: boolean }) {
  const variant = useContext(MarkdownVariant);
  const start = typeof token.start === 'number' ? token.start : 1;
  return (
    <View className={variant === 'proposal' ? 'gap-2' : 'gap-1'}>
      {token.items.map((item, index) => (
        <View key={`${index}-${item.raw}`} className="flex-row gap-2">
          <Text
            className={cn(
              'w-4 shrink-0 font-sans text-sm',
              variant === 'proposal'
                ? 'leading-5 text-foreground'
                : 'leading-5.5 text-muted-foreground',
            )}
          >
            {token.ordered ? `${start + index}.` : '•'}
          </Text>
          <View className="min-w-0 flex-1 gap-1">
            <Blocks
              tokens={item.tokens}
              caret={caret && index === token.items.length - 1}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Table({ token }: { token: Tokens.Table }) {
  const variant = useContext(MarkdownVariant);
  const cellCodeClassName = cn(
    'font-mono leading-5 text-foreground',
    variant === 'proposal' ? 'text-sm' : 'text-xs',
  );
  return (
    <View className="overflow-hidden rounded-xl border border-border">
      <ScrollView
        horizontal
        contentContainerClassName="min-w-full"
        showsHorizontalScrollIndicator={false}
      >
        <View className="flex-1">
          <View className="flex-row border-b border-border bg-sidebar">
            {token.header.map((cell, column) => (
              <View
                key={`${column}-${cell.text}`}
                className={cellClassName(column)}
              >
                <Text className="font-sans text-sm leading-5 font-semibold text-foreground">
                  <InlineTokens
                    tokens={cell.tokens}
                    codeClassName={
                      variant === 'proposal'
                        ? proposalInlineCodeClassName
                        : inlineCodeClassName
                    }
                  />
                </Text>
              </View>
            ))}
          </View>
          {token.rows.map((row, rowIndex) => (
            <View
              key={`${rowIndex}-${row.map((cell) => cell.text).join('|')}`}
              className={cn(
                'flex-row',
                rowIndex < token.rows.length - 1 && 'border-b border-border',
              )}
            >
              {row.map((cell, column) => (
                <View
                  key={`${column}-${cell.text}`}
                  className={cellClassName(column)}
                >
                  <Text className="font-sans text-sm leading-5 text-foreground">
                    <InlineTokens
                      tokens={cell.tokens}
                      codeClassName={cellCodeClassName}
                    />
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function cellClassName(column: number) {
  return cn(
    'px-3 py-1.5',
    column === 0 ? 'w-[180px] shrink-0' : 'min-w-[180px] flex-1',
  );
}

function Block({ token, caret }: { token: Token; caret: boolean }) {
  const variant = useContext(MarkdownVariant);
  switch (token.type) {
    case 'heading':
      return (
        <Prose
          tokens={token.tokens}
          caret={caret}
          className={
            variant === 'proposal'
              ? 'font-semibold'
              : 'pt-1 text-base leading-6 font-semibold'
          }
        />
      );
    case 'paragraph':
      return <Prose tokens={token.tokens} caret={caret} />;
    case 'text':
      return <Prose tokens={token.tokens ?? [token]} caret={caret} />;
    case 'list':
      return <List token={token as Tokens.List} caret={caret} />;
    case 'code':
      return (
        <View className="gap-2.5">
          <FeedCodeBlock
            code={token.text}
            language={token.lang || undefined}
            textClassName={variant === 'proposal' ? 'text-sm' : undefined}
          />
          {caret && <Caret />}
        </View>
      );
    case 'table':
      return (
        <View className="gap-2.5">
          <Table token={token as Tokens.Table} />
          {caret && <Caret />}
        </View>
      );
    case 'blockquote':
      return (
        <View className="gap-2.5 border-l-2 border-border pl-3">
          <Blocks tokens={token.tokens} caret={caret} />
        </View>
      );
    default:
      return caret ? <Caret /> : null;
  }
}

function Blocks({
  tokens,
  caret,
}: {
  tokens: Token[] | undefined;
  caret: boolean;
}) {
  const blocks = (tokens ?? []).filter(
    (token) => token.type !== 'space' && token.type !== 'hr',
  );
  const nodes: ReactNode[] = blocks.map((token, index) => (
    <Block
      key={`${index}-${token.raw}`}
      token={token}
      caret={caret && index === blocks.length - 1}
    />
  ));
  if (caret && blocks.length === 0) nodes.push(<Caret key="caret" />);
  return nodes;
}

// Agent markdown drawn with the Feed's own prose, code and table styles.
export const FeedMarkdown = memo(function FeedMarkdown({
  text,
  streaming = false,
  variant = 'feed',
}: FeedMarkdownProps) {
  const tokens = useMemo(() => lexer(text), [text]);
  return (
    <MarkdownVariant.Provider value={variant}>
      <View className={variant === 'proposal' ? 'gap-2' : 'gap-2.5'}>
        <Blocks tokens={tokens} caret={streaming} />
      </View>
    </MarkdownVariant.Provider>
  );
});
