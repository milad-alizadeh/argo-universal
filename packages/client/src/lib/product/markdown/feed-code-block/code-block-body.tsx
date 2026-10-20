import type * as React from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { trayCardClassName, trayCardSurface } from '#lib/generic/tray-surface';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';
import { ScrollFadeView } from '../../../generic/scroll-fade/scroll-fade';

interface CodeBlockBodyProps {
  code?: string;
  description?: string;
  textClassName?: string;
}

interface CodeTextProps {
  code: string;
  textClassName?: string;
}

function CodeText({ code, textClassName }: CodeTextProps): React.JSX.Element {
  return (
    <Text
      selectable
      role="code"
      className={cn(markdownBlockClassNames.codeText, textClassName)}
    >
      {code}
    </Text>
  );
}

// A vertical ScrollView grows by default; on iOS a fit-content parent such as the user message bubble then lays it out at its max height, leaving a blank area below the code.
function CodeScroll(props: CodeTextProps): React.JSX.Element {
  return (
    <View className={trayCardClassName}>
      <ScrollFadeView
        fitContent
        testID="code-scroll"
        className="max-h-75 wide:max-h-100"
        surfaceClassName={trayCardSurface}
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
  textClassName,
}: CodeBlockBodyProps): React.JSX.Element | null {
  if (code !== undefined)
    return <CodeScroll code={code} textClassName={textClassName} />;

  return <CodeDescription description={description} />;
}
