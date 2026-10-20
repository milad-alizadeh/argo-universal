import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { markdownBlockClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import { CodeBlockHeader } from '../code-block-header';
import { codeBlockGroup } from '../copy-button';
import { CodeBlockBody } from './code-block-body';
import {
  type CodeBlockSource,
  copyAction,
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
        codeBlockGroup,
        markdownBlockClassNames.codeBlock,
        'cursor-auto overflow-hidden border border-hairline px-1 pb-1',
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
