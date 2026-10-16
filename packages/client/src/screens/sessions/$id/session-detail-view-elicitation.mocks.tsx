import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { ElicitationFormProps } from '#features/requests';
import { ScaffoldMock } from '../../../../mocks/scaffold';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';

// The Session page with an Elicitation that closes once answered, inside the Frame on a wide window.
export function ElicitationPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  const page = <InteractiveElicitation {...props} />;

  return <SizeClass compact={page} wide={<FramedPage>{page}</FramedPage>} />;
}

function FramedPage({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ScaffoldMock
      onSectionChange={fn()}
      onSidebarShownChange={fn()}
      onInspectorStateChange={fn()}
    >
      {children}
    </ScaffoldMock>
  );
}

function InteractiveElicitation(
  props: SessionDetailViewProps,
): React.JSX.Element {
  const [answered, setAnswered] = useState(false);

  if (props.state !== 'open') return <SessionDetailView {...props} />;

  const elicitation = answered
    ? undefined
    : closableElicitation(props.elicitation, () => setAnswered(true));

  return <SessionDetailView {...props} elicitation={elicitation} />;
}

function closableElicitation(
  props: ElicitationFormProps | undefined,
  close: () => void,
): ElicitationFormProps | undefined {
  if (!props) return;

  return {
    ...props,
    onAnswer: (answer): void => {
      props.onAnswer(answer);
      close();
    },
  };
}
