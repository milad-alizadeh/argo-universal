import type { ContentBlock } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import { resourceName } from '../../../../lib/product/markdown/resource-name';

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
    <View className="h-[26px] flex-row items-center gap-1.5 rounded-md border border-border bg-card px-2">
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
