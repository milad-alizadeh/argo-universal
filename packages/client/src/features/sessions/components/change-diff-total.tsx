import type { ChangesSummary } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';

export function ChangeDiffTotal(
  props: ChangesSummary & { icon?: boolean },
): ReactElement {
  return (
    <View className="flex-row items-center gap-1">
      {props.icon && <Icon name="diff" size="xs" />}
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
