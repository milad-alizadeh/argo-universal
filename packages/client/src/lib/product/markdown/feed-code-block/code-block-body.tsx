import type { ReactNode } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import { codeSpanText } from '../../../generic/code-text/code-span';
import { ScrollFadeView } from '../../../generic/scroll-fade/scroll-fade';
import { codeSpans } from './code-highlight/code-spans';

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

// Coloured runs where the language is known, the code as it stands where it is not.
function codeContent(code: string, language: string | undefined): ReactNode {
  const spans = codeSpans(code, language);

  return spans === undefined ? code : codeSpanText(spans);
}

function CodeText(props: CodeTextProps): React.JSX.Element {
  return (
    <Text
      selectable
      role="code"
      testID="code-text"
      className={cn(markdownBlockClassNames.codeText, props.textClassName)}
    >
      {codeContent(props.code, props.language)}
    </Text>
  );
}

// A vertical ScrollView grows by default; on iOS a fit-content parent such as the user message bubble then lays it out at its max height, leaving a blank area below the code.
function CodeScroll(props: CodeTextProps): React.JSX.Element {
  return (
    <View className="overflow-hidden rounded-xl bg-content">
      <ScrollFadeView
        fitContent
        testID="code-scroll"
        className="max-h-75 wide:max-h-100"
        surfaceClassName="bg-content"
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
      surfaceClassName="bg-content"
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
      className="rounded-xl bg-content px-3 py-2.5 text-foreground"
    >
      {description}
    </Text>
  );
}

// Code scrolls in both directions; a resource without text shows its description instead.
export function CodeBlockBody(
  props: CodeBlockBodyProps,
): React.JSX.Element | null {
  const { code } = props;

  if (code === undefined)
    return <CodeDescription description={props.description} />;

  return <CodeScroll {...props} code={code} />;
}
