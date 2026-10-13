import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Composer,
  type ComposerProps,
  type ComposerDraft,
} from '../src/features/composer';
import { composerProps } from './composer-mock';

export function RequestComposerPreview(
  props: Pick<ComposerProps, 'permissionRequest' | 'planProposal'>,
): ReactElement {
  const [draft, setDraft] = useState<ComposerDraft>({
    text: '',
    attachments: [],
  });
  const [denialMessage, setDenialMessage] = useState(
    props.permissionRequest?.denialMessage,
  );
  return (
    <Composer
      {...composerProps({
        ...props,
        draft,
        onDraftChange: setDraft,
        onAttachImages: () => {},
        onSend: () => {},
        onStop: () => {},
        sessionStarted: true,
        running: true,
      })}
      permissionRequest={
        props.permissionRequest && {
          ...props.permissionRequest,
          denialMessage,
          onDenialMessageChange: (message) => {
            setDenialMessage(message);
            props.permissionRequest?.onDenialMessageChange(message);
          },
        }
      }
    />
  );
}
