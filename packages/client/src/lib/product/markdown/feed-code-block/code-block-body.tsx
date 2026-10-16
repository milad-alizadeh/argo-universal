import type * as React from 'react';
import { ScrollView } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';

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
    <ScrollView testID="code-scroll" className="max-h-75 grow-0 wide:max-h-100">
      <ScrollView
        horizontal
        className="grow-0 shrink-0"
        contentContainerClassName="px-3 py-2"
      >
        <CodeText {...props} />
      </ScrollView>
    </ScrollView>
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

  return description ? (
    <Text role="body" className="px-3 py-2 text-foreground">
      {description}
    </Text>
  ) : null;
}
