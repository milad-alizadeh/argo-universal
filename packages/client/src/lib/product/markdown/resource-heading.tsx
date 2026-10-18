import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { resourceIcon } from './resource-name';

export interface HeaderResource {
  uri: string;
  description?: string;
}

// Splits after the last slash, so the name stays whole while the folders ellipsize.
function uriSplit(uri: string): number {
  const lastSlash = uri.lastIndexOf('/');

  return lastSlash >= 0 ? lastSlash + 1 : Math.ceil(uri.length / 2);
}

function UriPart({
  className,
  ...props
}: ComponentProps<typeof Text>): React.JSX.Element {
  return (
    <Text
      aria-hidden
      numberOfLines={1}
      role="code"
      className={cn(className, 'text-muted-foreground')}
      {...props}
    />
  );
}

function ResourceUri({ uri }: { uri: string }): React.JSX.Element {
  const split = uriSplit(uri);

  return (
    <View accessible accessibilityLabel={uri} className="min-w-0 flex-row">
      <UriPart className="min-w-0 shrink">{uri.slice(0, split)}</UriPart>
      <UriPart ellipsizeMode="head" className="max-w-3/4 shrink-0">
        {uri.slice(split)}
      </UriPart>
    </View>
  );
}

function ResourceIcon({ uri }: { uri: string }): React.JSX.Element {
  return (
    <View className="h-6 w-icon-md shrink-0 items-center justify-center wide-type:h-5">
      <Icon
        role="control"
        name={resourceIcon(uri)}
        className="text-muted-foreground"
      />
    </View>
  );
}

interface ResourceHeadingProps {
  title: string;
  resource: HeaderResource;
}

function ResourceText({
  title,
  resource,
}: ResourceHeadingProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text>{title}</Text>
      <ResourceUri uri={resource.uri} />
      {!!resource.description && (
        <Text className="text-muted-foreground">{resource.description}</Text>
      )}
    </View>
  );
}

export function ResourceHeading(
  props: ResourceHeadingProps,
): React.JSX.Element {
  return (
    <>
      <ResourceIcon uri={props.resource.uri} />
      <ResourceText {...props} />
    </>
  );
}
