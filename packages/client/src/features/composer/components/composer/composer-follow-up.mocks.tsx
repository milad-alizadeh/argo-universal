import { Button } from '@repo/kit/primitives/actions/button';
import { useState, type JSX } from 'react';
import { Composer } from './composer';
import type { ComposerProps } from './composer-types';

export const predictedPrompt = 'Run the regression tests';

type ExampleState = {
  draft: ComposerProps['draft'];
  text: string | null;
  enabled: boolean;
  dismissed: boolean;
  turnId: string;
  mount: number;
};

type Example = {
  state: ExampleState;
  update: (change: Partial<ExampleState>) => void;
};

const initialText = (props: ComposerProps): string | null =>
  props.followUpSuggestion?.text ?? null;

const initialEnabled = (props: ComposerProps): boolean =>
  props.followUpSuggestion?.enabled ?? true;

function initialState(props: ComposerProps): ExampleState {
  return {
    draft: props.draft,
    text: initialText(props),
    enabled: initialEnabled(props),
    dismissed: false,
    turnId: 'first-turn',
    mount: 0,
  };
}

function useExample(props: ComposerProps): Example {
  const [state, setState] = useState(() => initialState(props));

  return {
    state,
    update: (change) => setState((previous) => ({ ...previous, ...change })),
  };
}

function exampleComposerProps(
  props: ComposerProps,
  { state, update }: Example,
): ComposerProps {
  const onDraftChange: ComposerProps['onDraftChange'] = (next) => {
    update({ draft: next });
    props.onDraftChange(next);
  };

  return {
    ...props,
    draft: state.draft,
    onDraftChange,
    followUpSuggestion: examplePrediction(state, update),
  };
}

function examplePrediction(
  state: ExampleState,
  update: Example['update'],
): ComposerProps['followUpSuggestion'] {
  if (state.text === null) return undefined;

  return {
    sessionId: 'example-session',
    turnId: state.turnId,
    text: state.text,
    enabled: state.enabled,
    dismissed: state.dismissed,
    onDismiss: () => update({ dismissed: true }),
  };
}

function advanceExample(update: Example['update']): void {
  update({ turnId: 'second-turn', dismissed: false, text: predictedPrompt });
}

function DeliveryButtons({ state, update }: Example): JSX.Element {
  return (
    <>
      <Button
        label="Deliver prediction"
        onPress={() => update({ text: predictedPrompt })}
      />
      <Button
        label="Toggle suggestions"
        onPress={() => update({ enabled: !state.enabled })}
      />
    </>
  );
}

function LifecycleButtons({ state, update }: Example): JSX.Element {
  return (
    <>
      <Button
        label="Remount Composer"
        onPress={() => update({ mount: state.mount + 1 })}
      />
      <Button label="Next Turn" onPress={() => advanceExample(update)} />
    </>
  );
}

export function FollowUpComposer(props: ComposerProps): JSX.Element {
  const example = useExample(props);

  return (
    <>
      <Composer
        {...exampleComposerProps(props, example)}
        key={example.state.mount}
      />
      <DeliveryButtons {...example} />
      <LifecycleButtons {...example} />
    </>
  );
}
