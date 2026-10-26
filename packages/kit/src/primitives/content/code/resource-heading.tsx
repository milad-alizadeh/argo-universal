import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { PathText } from '#primitives/content/path-text';
import { Text } from '#primitives/content/text';
import { resourceIcon } from './resource-name';

export interface HeaderResource {
  uri: string;
  description?: string;
}

function ResourceIcon({ uri }: { uri: string }): React.JSX.Element {
  return (
    <View className="h-6 w-icon-md shrink-0 items-center justify-center wide-type:h-5">
      <Icon name={resourceIcon(uri)} className="text-muted-foreground" />
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
      <PathText path={resource.uri} quiet />
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
