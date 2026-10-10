import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { CodeBlockHeader } from './code-block-header';

interface CodeBlockResource {
  name: string;
  uri: string;
  description?: string;
}

export type FeedCodeBlockProps = {
  language?: string;
  footer?: ReactNode;
  textClassName?: string;
} & (
  | { code: string; resource?: never }
  | { code?: string; resource: CodeBlockResource }
);

// Code and supplied resources share one header, Copy control and scrolling body.
export function FeedCodeBlock({
  code,
  language,
  footer,
  resource,
  textClassName,
}: FeedCodeBlockProps): React.JSX.Element {
  const copyValue = resource ? (code ?? resource.uri) : code;
  let copyLabel = 'Copy code';
  if (resource)
    copyLabel = code === undefined ? 'Copy URI' : 'Copy resource text';
  return (
    <View
      className={cn(
        Platform.select({ web: 'code-block' }),
        'cursor-auto overflow-hidden rounded-xl border border-border bg-sidebar',
      )}
    >
      <CodeBlockHeader
        title={resource?.name ?? language ?? ''}
        copyValue={copyValue}
        copyLabel={copyLabel}
        resource={resource}
        hasBody={code !== undefined}
      />
      {code !== undefined && (
        <ScrollView testID="code-scroll" className="max-h-75 wide:max-h-100">
          <ScrollView
            horizontal
            className="grow-0 shrink-0"
            contentContainerClassName="px-3 py-2"
          >
            <Text
              selectable
              className={cn('type-code-block text-foreground', textClassName)}
            >
              {code}
            </Text>
          </ScrollView>
        </ScrollView>
      )}
      {footer}
    </View>
  );
}
