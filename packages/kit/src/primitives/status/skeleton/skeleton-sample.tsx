import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Avatar } from '#primitives/content/avatar';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { Pill } from '#primitives/status/pill';
import { Skeleton } from './index';
import type { SkeletonProps } from './skeleton-props';

const paragraph =
  'A paragraph that is long enough to wrap onto a second line and a third, so each rendered line gets a bar as wide as the line itself, with the last one shorter.';

function Report(): ReactElement {
  return (
    <>
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        Quarterly report
      </Text>
      <Text>{paragraph}</Text>
    </>
  );
}

function Badges(): ReactElement {
  return (
    <View className="flex-row items-center gap-3">
      <Icon name="settings" />
      <Avatar initials="SR" accessibilityLabel="Sam Rivera" />
      <Pill text="Ready" tone="success" />
    </View>
  );
}

function Details(): ReactElement {
  return (
    <View className="h-56 w-full">
      <FieldGroup>
        <FieldGroup.Section title="Details">
          <FieldGroup.Value title="Version" value="1.2.3" />
          <FieldGroup.Value title="Build" value="42" />
        </FieldGroup.Section>
      </FieldGroup>
    </View>
  );
}

function Note(): ReactElement {
  return (
    <Skeleton.Ignore>
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        Always visible
      </Text>
    </Skeleton.Ignore>
  );
}

function Content(): ReactElement {
  return (
    <View className="gap-4">
      <Report />
      <Badges />
      <Details />
      <Note />
    </View>
  );
}

/*
 * Story material: mixed content for a Skeleton to work out its placeholders from. A heading and a paragraph that
 * wraps to several lines, an icon, an avatar and a pill in a row, a FieldGroup, and an ignored note that stays.
 */
export function SkeletonSample(
  props: Omit<SkeletonProps, 'children'>,
): ReactElement {
  return (
    <View className="w-full max-w-xl p-4">
      <Skeleton {...props}>
        <Content />
      </Skeleton>
    </View>
  );
}
