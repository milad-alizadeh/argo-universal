import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { Composer } from '#features/composer';
import { ElicitationSheet } from '#features/requests';
import { SessionCallout, StoppedTurnCallout } from '#features/sessions';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { composerUnderQuestion } from './composer-under-question';
import type { OpenSessionViewProps } from './session-detail-view';

function QuestionSheet({
  elicitation,
}: Pick<OpenSessionViewProps, 'elicitation'>): React.ReactNode {
  if (!elicitation) return null;

  return (
    <ElicitationSheet key={elicitation.request.requestId} {...elicitation} />
  );
}

function composerCallout({
  callout,
  stoppedTurn,
}: Pick<OpenSessionViewProps, 'callout' | 'stoppedTurn'>): React.ReactNode {
  if (callout) return <SessionCallout {...callout} />;

  return stoppedTurn && <StoppedTurnCallout {...stoppedTurn} />;
}

type SessionComposerProps = Pick<
  OpenSessionViewProps,
  'elicitation' | 'composer' | 'callout' | 'stoppedTurn'
>;

export function SessionComposer(
  props: SessionComposerProps,
): React.JSX.Element {
  const filled = useSessionFill().filled;

  return (
    // As wide as the Feed: the SessionColumn around it sets the width.
    <View className={cn('w-full items-center', filled && filledClass)}>
      <QuestionSheet elicitation={props.elicitation} />
      <Composer
        {...composerUnderQuestion(props.composer, props.elicitation)}
        callout={composerCallout(props)}
      />
    </View>
  );
}
