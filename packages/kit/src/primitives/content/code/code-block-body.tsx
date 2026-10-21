import type { ReactNode } from 'react';
import type * as React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#kit/markdown-marks';
import { trayCardClassName, trayCardSurface } from '#kit/tray-surface';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { syntaxRunsText } from '../../../code-text/syntax-run';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { syntaxRuns } from './code-highlight/syntax-runs';

interface CodeBlockBodyProps {
  code?: string;
  description?: string;
  language?: string;
  textClassName?: string;
}

interface CodeTextProps {
  code: string;
  language?: string;
  textClassName?: string;
}

/*
 * Coloured runs where the language is known, the code as it stands where it is not. Tokenising is
 * the one costly part of drawing a fence, and a streaming row renders many times over.
 */
function useCodeContent(code: string, language?: string): ReactNode {
  const runs = useMemo(() => syntaxRuns(code, language), [code, language]);

  return runs === undefined ? code : syntaxRunsText(runs);
}

function CodeText(props: CodeTextProps): React.JSX.Element {
  const content = useCodeContent(props.code, props.language);

  return (
    <Text
      selectable
      role="code"
      testID="code-text"
      className={cn(markdownBlockClassNames.codeText, props.textClassName)}
    >
      {content}
    </Text>
  );
}

/*
 * Declaring the bottom padding keeps a list's end gap off the code: the code's own padding belongs
 * inside the sideways scroll, so the horizontal scrollbar sits on the card's bottom edge rather than
 * floating above a strip of dead space.
 */
const codeScrollContentClassName = 'pb-0';

// A vertical ScrollView grows by default; on iOS a fit-content parent such as the user message bubble then lays it out at its max height, leaving a blank area below the code.
function CodeScroll(props: CodeTextProps): React.JSX.Element {
  return (
    <View className={trayCardClassName}>
      <ScrollFadeView
        fitContent
        testID="code-scroll"
        className="max-h-75 wide:max-h-100"
        surfaceClassName={trayCardSurface}
        contentContainerClassName={codeScrollContentClassName}
      >
        <HorizontalCode {...props} />
      </ScrollFadeView>
    </View>
  );
}

function HorizontalCode(props: CodeTextProps): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal
      className="grow-0 shrink-0"
      surfaceClassName={trayCardSurface}
      contentContainerClassName="px-3 py-2.5"
    >
      <CodeText {...props} />
    </ScrollFadeView>
  );
}

function CodeDescription({
  description,
}: Pick<CodeBlockBodyProps, 'description'>): React.JSX.Element | null {
  if (!description) return null;

  return (
    <Text
      role="body"
      className="rounded-xl bg-card px-3 py-2.5 text-foreground"
    >
      {description}
    </Text>
  );
}

// Code scrolls in both directions; a resource without text shows its description instead.
export function CodeBlockBody({
  code,
  description,
  language,
  textClassName,
}: CodeBlockBodyProps): React.JSX.Element | null {
  if (code === undefined) return <CodeDescription description={description} />;

  return (
    <CodeScroll code={code} language={language} textClassName={textClassName} />
  );
}
