import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { ElicitationFormProps } from '#features/requests';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { DesktopShellFrame } from '../../../../mocks/desktop-shell';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';

// The Session page with an Elicitation that closes once answered, inside the shell on a wide window.
export function ElicitationPreview(
  props: SessionDetailViewProps,
): React.JSX.Element {
  if (!useWide()) return <InteractiveElicitation {...props} />;

  return (
    <DesktopShellFrame
      onSectionChange={fn()}
      onSidebarShownChange={fn()}
      onInspectorStateChange={fn()}
    >
      <InteractiveElicitation {...props} />
    </DesktopShellFrame>
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
