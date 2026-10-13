import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Composer,
  type ComposerProps,
  type ComposerDraft,
} from '../src/features/composer';
import { composerProps } from './composer-mock';
const emptyDraft: ComposerDraft = { text: '', attachments: [] };
type RequestProps = Pick<ComposerProps, 'permissionRequest' | 'planProposal'>;
export function RequestComposerPreview(props: RequestProps): ReactElement {
  const draft = useRequestDraft(props);
  const permissionRequest = useDenialMessage(props.permissionRequest);
  return <Composer {...draft} permissionRequest={permissionRequest} />;
}
function useRequestDraft(props: RequestProps): ComposerProps {
  const [draft, setDraft] = useState<ComposerDraft>(emptyDraft);
  return composerProps({
    ...props,
    draft,
    onDraftChange: setDraft,
    onAttachImages: () => {},
    onSend: () => {},
    onStop: () => {},
    sessionStarted: true,
    running: true,
  });
}
function useDenialMessage(
  request: ComposerProps['permissionRequest'],
): ComposerProps['permissionRequest'] {
  const [denialMessage, setDenialMessage] = useState(request?.denialMessage);
  return (
    request && {
      ...request,
      denialMessage,
      onDenialMessageChange: (message: string | undefined): void => {
        setDenialMessage(message);
        request.onDenialMessageChange(message);
      },
    }
  );
}
