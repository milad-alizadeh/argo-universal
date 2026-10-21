import type { ChangesSummary } from '@repo/contracts';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

export function ChangeDiffTotal(
  props: ChangesSummary & { icon?: boolean },
): ReactElement {
  return (
    <View className="flex-row items-center gap-1">
      {props.icon && <Icon name="diff" role="secondary" />}
      <Text role="secondary">{props.files} files</Text>
      <DiffDeltas {...props} />
    </View>
  );
}

function DiffDeltas(props: ChangesSummary): ReactElement {
  return (
    <>
      <Text role="secondary" tone="success">
        +{props.additions}
      </Text>
      <Text role="secondary" tone="danger">
        −{props.deletions}
      </Text>
    </>
  );
}
