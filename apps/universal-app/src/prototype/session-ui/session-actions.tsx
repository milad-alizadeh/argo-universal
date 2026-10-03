// PROTOTYPE: rename and archive, shared by the row menu and the Session header menu.
import { Archive, FileDiff, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { actions, getSession } from './store';
import { type Anchor, OptionRow, Overlay, Press, useColors, useWide } from './ui';

export type ActionsStep = 'menu' | 'rename' | 'archive' | null;

export function SessionActions({
  id,
  step,
  setStep,
  anchor,
  onFiles,
}: {
  id: string;
  step: ActionsStep;
  setStep: (step: ActionsStep) => void;
  anchor?: Anchor;
  onFiles?: () => void;
}) {
  const colors = useColors();
  const session = getSession(id);
  if (!session) return null;
  const close = () => setStep(null);
  const archive = () => {
    if (session.changedFiles.length && step !== 'archive') {
      setStep('archive');
      return;
    }
    close();
    actions.archive(id);
  };
  return (
    <>
      <Overlay open={step === 'menu'} onClose={close} anchor={anchor} title={session.title} width={220}>
        {onFiles && session.changedFiles.length ? (
          <OptionRow
            label={`Changed files · ${session.changedFiles.length}`}
            icon={<FileDiff size={15} color={colors.foreground} />}
            onPress={() => {
              close();
              onFiles();
            }}
          />
        ) : null}
        <OptionRow label="Rename" icon={<Pencil size={15} color={colors.foreground} />} onPress={() => setStep('rename')} />
        {session.archived ? null : (
          <OptionRow label="Archive" icon={<Archive size={15} color={colors.red} />} tone={colors.red} onPress={archive} />
        )}
      </Overlay>
      {step === 'rename' ? <RenameDialog id={id} initial={session.title} onClose={close} /> : null}
      <Overlay open={step === 'archive'} onClose={close} title="Archive with uncommitted files?" width={340}>
        <View className="gap-3 px-2.5 pb-2">
          <Text className="text-sm text-muted-foreground">
            {session.changedFiles.length} uncommitted files in {session.branch} will be lost when the worktree is deleted. The branch is kept.
          </Text>
          {session.changedFiles.map((file) => (
            <Text key={file.path} className="font-mono text-xs text-foreground" numberOfLines={1} ellipsizeMode="middle">
              {file.path}
            </Text>
          ))}
          <View className="flex-row justify-end gap-2 pt-1">
            <Press onPress={close} className="rounded-lg px-3 py-2" hoverClassName="bg-muted">
              <Text className="text-sm text-foreground">Cancel</Text>
            </Press>
            <Press
              onPress={() => {
                close();
                actions.archive(id);
              }}
              className="rounded-lg bg-red-500 px-3 py-2"
              hoverClassName="bg-red-600"
            >
              <Text className="text-sm font-medium text-white">Archive</Text>
            </Press>
          </View>
        </View>
      </Overlay>
    </>
  );
}

function RenameDialog({ id, initial, onClose }: { id: string; initial: string; onClose: () => void }) {
  const [title, setTitle] = useState(initial);
  const wide = useWide();
  const save = () => {
    if (title.trim()) actions.rename(id, title.trim());
    onClose();
  };
  return (
    <Overlay open onClose={onClose} title="Rename Session" width={360}>
      <View className="gap-3 px-2.5 pb-2">
        <TextInput
          autoFocus
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={save}
          selectTextOnFocus
          className={`rounded-lg border border-border px-3 text-foreground ${wide ? 'py-2 text-sm' : 'py-3 text-base'}`}
        />
        <View className="flex-row justify-end gap-2">
          <Press onPress={onClose} className="rounded-lg px-3 py-2" hoverClassName="bg-muted">
            <Text className="text-sm text-foreground">Cancel</Text>
          </Press>
          <Press onPress={save} className="rounded-lg bg-primary px-3 py-2">
            <Text className="text-sm font-medium text-primary-foreground">Save</Text>
          </Press>
        </View>
      </View>
    </Overlay>
  );
}
