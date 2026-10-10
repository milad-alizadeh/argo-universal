import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { CodeBlockHeader } from './code-block-header';

interface CodeBlockResource {
  name: string;
  uri: string;
  description?: string;
}

type CodeBlockSource =
  | { code: string; resource?: never; uri?: never; description?: never }
  | {
      code?: string;
      resource: CodeBlockResource;
      uri?: never;
      description?: never;
    }
  // A resource with its URI as the header and its text, or else its description, as the body.
  | { code?: string; uri: string; description?: string; resource?: never };

export type FeedCodeBlockProps = {
  language?: string;
  footer?: ReactNode;
  textClassName?: string;
} & CodeBlockSource;

// Code and supplied resources share one header, Copy control and scrolling body.
export function FeedCodeBlock({
  code,
  language,
  footer,
  resource,
  uri,
  description,
  textClassName,
}: FeedCodeBlockProps): React.JSX.Element {
  const resourceUri = resource?.uri ?? uri;
  let copy = { value: code ?? '', label: 'Copy code' };
  if (resourceUri !== undefined)
    copy =
      code === undefined
        ? { value: resourceUri, label: 'Copy URI' }
        : { value: code, label: 'Copy resource text' };
  return (
    <View
      className={cn(
        Platform.select({ web: 'code-block' }),
        'cursor-auto overflow-hidden rounded-xl web:rounded-surface web:shadow-card border border-border bg-sidebar',
      )}
    >
      <CodeBlockHeader
        title={resource?.name ?? uri ?? language ?? ''}
        copyValue={copy.value}
        copyLabel={copy.label}
        resource={resource}
        hasBody={code !== undefined || !!description}
      />
      {code === undefined && !!description && (
        <Text role="body" className="px-3 py-2 text-foreground">
          {description}
        </Text>
      )}
      {code !== undefined && (
        <ScrollView testID="code-scroll" className="max-h-75 wide:max-h-100">
          <ScrollView
            horizontal
            className="grow-0 shrink-0"
            contentContainerClassName="px-3 py-2"
          >
            <Text
              selectable
              role="code"
              className={cn('text-foreground', textClassName)}
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
