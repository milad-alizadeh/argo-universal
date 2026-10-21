import { Text, type Tone } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import type { ReactNode } from 'react';
import type { FileDiff } from '../../view/file-diff';

interface ChangeCountProps {
  count: number;
  tone: Tone;
  children: ReactNode;
}

function ChangeCount(props: ChangeCountProps): React.JSX.Element | null {
  if (props.count <= 0) return null;

  return (
    <Text selectable={false} role="badge" tone={props.tone}>
      {props.children}
    </Text>
  );
}

// A file's added and removed line counts; a count of zero is left out.
export function ChangeCounts({ file }: { file: FileDiff }): ReactNode {
  return (
    <>
      <ChangeCount count={file.added} tone="success">
        +{file.added}
      </ChangeCount>
      <ChangeCount count={file.removed} tone="danger">
        {`−${file.removed}`}
      </ChangeCount>
    </>
  );
}
