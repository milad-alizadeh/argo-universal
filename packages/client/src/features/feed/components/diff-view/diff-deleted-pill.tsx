import { Pill } from '@repo/kit/primitives/status/pill';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { FileDiff } from '../../view/file-diff';

type Operated = Pick<FileDiff, 'operation'>;

export const isDeleted = (file: Operated): boolean =>
  file.operation === 'delete';

// An empty or binary deleted file has no removed lines to say it is gone. A Pill sets itself at the top of its row; this centres it on the header's line.
export const DeletedPill = ({ file }: { file: Operated }): ReactNode =>
  isDeleted(file) ? (
    <View className="justify-center self-stretch">
      <Pill text="Deleted" tone="danger" />
    </View>
  ) : null;
