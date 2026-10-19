import { useId } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { isConfigurationInactive, isInactive } from './composer-conditions';
import type { ComposerLayout, ComposerProps } from './composer-types';

export function useComposerLayout(
  props: ComposerProps,
  sendState: ComposerLayout['sendState'],
): ComposerLayout {
  const composerId = useId();
  const wide = useContentWide();

  const send = (): void => {
    if (sendState === 'ready') props.onSend(props.draft);
  };

  return Object.assign(
    { props, composerId, wide, sendState, send },
    composerActivity(props),
  );
}

function composerActivity(
  props: ComposerProps,
): Pick<ComposerLayout, 'inactive' | 'configurationInactive'> {
  return {
    inactive: isInactive(props),
    configurationInactive: isConfigurationInactive(props),
  };
}
