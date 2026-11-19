import type { CustomVoice, CustomVoiceInput } from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC, type ServerMutation, type TRPC } from '#features/connection';
import type { CustomVoiceEditor } from './custom-voice-props';
import type { VoiceDetailViewProps } from './voice-detail-view-props';

type SaveMutation = ServerMutation<TRPC['voice']['saveCustomVoice']>;

type DeleteMutation = ServerMutation<TRPC['voice']['deleteCustomVoice']>;

// The custom voice form and what it asks of the Server.
export type CustomVoiceChanges = Pick<
  VoiceDetailViewProps,
  'editor' | 'editorError' | 'onEditorChange'
> & {
  save: (voice: CustomVoiceInput) => void;
  remove: (id: string) => void;
};

// Reads the settings again, once a custom voice changed.
function useReread(): () => void {
  const trpc = useTRPC(),
    cache = useQueryClient();

  return () =>
    void cache.invalidateQueries({
      queryKey: trpc.voice.getSettings.queryKey(),
    });
}

type Done = {
  close: () => void;
  reread: () => void;
  choose: (voice: string) => void;
};

// A new voice is chosen at once, as the person made it from the Voice picker; an edited one keeps the choice.
const savedThen =
  (done: Done) =>
  (saved: CustomVoice, input: CustomVoiceInput): void => {
    done.close();

    if (input.id === undefined) done.choose(saved.id);
    else done.reread();
  };

function useSave(done: Done): SaveMutation {
  const { voice } = useTRPC();

  return useMutation(
    voice.saveCustomVoice.mutationOptions({ onSuccess: savedThen(done) }),
  );
}

function useDelete(done: Done): DeleteMutation {
  const { voice } = useTRPC();

  return useMutation(
    voice.deleteCustomVoice.mutationOptions({
      onSuccess: () => {
        done.close();
        done.reread();
      },
    }),
  );
}

// Opening or closing the form forgets the last failure.
const editorChange =
  (
    setEditor: (editor?: CustomVoiceEditor) => void,
    mutations: { reset: () => void }[],
  ) =>
  (next?: CustomVoiceEditor): void => {
    for (const mutation of mutations) mutation.reset();
    setEditor(next);
  };

type HeldEditor = {
  editor?: CustomVoiceEditor;
  setEditor: (editor?: CustomVoiceEditor) => void;
  done: Done;
};

// The open form, and what a finished save or delete does to it.
function useHeldEditor(choose: (voice: string) => void): HeldEditor {
  const [editor, setEditor] = useState<CustomVoiceEditor>();
  const reread = useReread();
  const close = (): void => setEditor(undefined);

  return { editor, setEditor, done: { close, reread, choose } };
}

const changesOf = (
  held: HeldEditor,
  save: SaveMutation,
  remove: DeleteMutation,
): CustomVoiceChanges => ({
  editor: held.editor,
  editorError: (save.error ?? remove.error)?.message,
  onEditorChange: editorChange(held.setEditor, [save, remove]),
  save: (voice) => save.mutate(voice),
  remove: (id) => remove.mutate({ id }),
});

/*
 * Saving or deleting a custom voice closes the form and reads the settings again; a failure keeps the form open and
 * says why.
 */
export function useCustomVoiceChanges(
  choose: (voice: string) => void,
): CustomVoiceChanges {
  const held = useHeldEditor(choose);

  return changesOf(held, useSave(held.done), useDelete(held.done));
}
