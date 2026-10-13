import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import { CodeBlockHeader } from '../code-block-header';
import { CodeBlockBody } from './code-block-body';
import {
  type CodeBlockSource,
  copyAction,
  hasBody,
  headerTitle,
} from './code-block-source';

export type FeedCodeBlockProps = {
  language?: string;
  footer?: ReactNode;
  textClassName?: string;
} & CodeBlockSource;

function CodeBlockFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <View
      className={cn(
        Platform.select({ web: 'code-block' }),
        'cursor-auto overflow-hidden',
        markdownBlockClassNames.codeBlock,
      )}
    >
      {children}
    </View>
  );
}

function SourceHeader(props: FeedCodeBlockProps): ReactElement {
  const copy = copyAction(props);
  return (
    <CodeBlockHeader
      title={headerTitle(props, props.language)}
      copyValue={copy.value}
      copyLabel={copy.label}
      resource={props.resource}
      hasBody={hasBody(props)}
    />
  );
}

// Code and supplied resources share one header, Copy control and scrolling body.
export function FeedCodeBlock(props: FeedCodeBlockProps): ReactElement {
  return (
    <CodeBlockFrame>
      <SourceHeader {...props} />
      <CodeBlockBody
        code={props.code}
        description={props.description}
        textClassName={props.textClassName}
      />
      {props.footer}
    </CodeBlockFrame>
  );
}
