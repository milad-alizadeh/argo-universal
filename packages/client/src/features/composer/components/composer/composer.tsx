import type * as React from 'react';
import { View } from 'react-native';
import { PlanProposalCard } from '#features/requests';
import { ComposerCard } from './composer-card';
import { sendButtonState } from './composer-conditions';
import { useComposerLayout } from './composer-layout';
import { ComposerBottomTray, ComposerTopTray } from './composer-trays';
import type { ComposerProps } from './composer-types';
export type { ComposerDraft, ComposerProps } from './composer-types';
export type { ComposerAttachment } from '../composer-attachment-card/composer-attachment-card';

export function Composer(props: ComposerProps): React.JSX.Element {
  const sendState = sendButtonState(props);
  const layout = useComposerLayout(props, sendState);
  return (
    <View nativeID={layout.composerId} className="w-full items-center">
      <ComposerTopTray {...layout} />
      {props.planProposal ? (
        <PlanProposalCard {...props.planProposal} />
      ) : (
        <ComposerCard {...layout} />
      )}
      <ComposerBottomTray {...layout} />
    </View>
  );
}
