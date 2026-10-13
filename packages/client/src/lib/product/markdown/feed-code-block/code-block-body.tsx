import type * as React from 'react';
import { ScrollView } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';

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

function CodeScroll(props: CodeTextProps): React.JSX.Element {
  return (
    <ScrollView testID="code-scroll" className="max-h-75 wide:max-h-100">
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
