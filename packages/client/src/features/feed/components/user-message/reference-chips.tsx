import type { ContentBlock } from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { resourceName } from '@repo/kit/primitives/content/code';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';

export type Reference = Extract<
  ContentBlock,
  { type: 'resource_link' | 'resource' }
>;

interface ReferenceTarget {
  uri: string;
  mimeType?: string | null;
}

const referenceTarget = (reference: Reference): ReferenceTarget =>
  reference.type === 'resource_link' ? reference : reference.resource;

function referenceName(reference: Reference): string {
  if (reference.type === 'resource_link') return reference.name;

  return resourceName(reference.resource.uri);
}

function isFolder(reference: Reference): boolean {
  const { uri, mimeType } = referenceTarget(reference);

  return mimeType === 'inode/directory' || uri.endsWith('/');
}

interface ReferenceChipProps {
  reference: Reference;
}

function ReferenceChip({ reference }: ReferenceChipProps): React.JSX.Element {
  return (
    <View className="h-6.5 flex-row items-center gap-1.5 rounded-md border border-border bg-card px-2">
      <Icon
        name={isFolder(reference) ? 'folder' : 'file'}
        role="body"
        className="text-muted-foreground"
      />
      <Text role="body" className="font-sans">
        {referenceName(reference)}
      </Text>
    </View>
  );
}

const chip = ({
  item,
  key,
}: {
  item: Reference;
  key: string;
}): React.JSX.Element => <ReferenceChip key={key} reference={item} />;

export function ReferenceChips({
  references,
}: {
  references: Reference[];
}): React.JSX.Element | null {
  if (references.length === 0) return null;

  return (
    <View className="max-w-full flex-row flex-wrap justify-end gap-1.5">
      {withOccurrenceKeys(references, referenceName).map(chip)}
    </View>
  );
}
