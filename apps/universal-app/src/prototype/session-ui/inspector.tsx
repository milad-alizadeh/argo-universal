// PROTOTYPE: the desktop Session inspector, a right sidebar as in old Argo. It shows the changed files, one edit's diff, or a Subagent or Shell.
import { Check, ChevronRight, Maximize2, Minimize2, PanelRight } from 'lucide-react-native';
import { createContext, useContext, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Diff } from './feed';
import type { ChangedFile, Session } from './types';
import { Press, useColors } from './ui';
import { WorkBody, WorkHeader } from './work';

export type InspectorContent = { kind: 'files' } | { kind: 'edit'; path: string; lines: string[]; added: number; removed: number } | { kind: 'work'; id: string };

// Set only on desktop; the phone Feed expands an edit inline instead.
export const InspectorContext = createContext<((content: InspectorContent) => void) | null>(null);
export const useOpenInspector = () => useContext(InspectorContext);

export function InspectorToggles({ open, expanded, onToggle, onExpand }: { open: boolean; expanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1">
      {open ? (
        <Press onPress={onExpand} className="rounded-md p-1.5" hoverClassName="bg-muted">
          {expanded ? <Minimize2 size={15} color={colors.muted} /> : <Maximize2 size={15} color={colors.muted} />}
        </Press>
      ) : null}
      <Press onPress={onToggle} className={`rounded-md p-1.5 ${open ? 'bg-muted' : ''}`} hoverClassName="bg-muted">
        <PanelRight size={16} color={open ? colors.foreground : colors.muted} />
      </Press>
    </View>
  );
}

export function Inspector({ session, content, expanded }: { session: Session; content: InspectorContent; expanded: boolean }) {
  return (
    <View className={`mr-3 mb-3 overflow-hidden rounded-xl border border-border bg-background ${expanded ? 'ml-3 flex-1' : ''}`} style={expanded ? undefined : { width: 460 }}>
      {content.kind === 'files' ? (
        <FileDiffList session={session} />
      ) : content.kind === 'work' ? (
        <View className="flex-1">
          <View className="flex-row border-b border-border px-3 py-2.5">
            <WorkHeader session={session} id={content.id} />
          </View>
          <ScrollView contentContainerClassName="p-4">
            <WorkBody session={session} id={content.id} />
          </ScrollView>
        </View>
      ) : (
        <EditDiff content={content} />
      )}
    </View>
  );
}

function FileDiffList({ session }: { session: Session }) {
  const colors = useColors();
  const [viewed, setViewed] = useState<ReadonlySet<string>>(new Set());
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const flip = (set: ReadonlySet<string>, path: string) => {
    const next = new Set(set);
    if (!next.delete(path)) next.add(path);
    return next;
  };
  if (!session.changedFiles.length) return <Text className="p-4 text-sm text-muted-foreground">No changed files in {session.branch}.</Text>;
  return (
    <ScrollView contentContainerClassName="pb-4">
      <Text className="px-3 pt-3 pb-2 text-xs text-muted-foreground">
        {session.changedFiles.length} files changed · {viewed.size} viewed
      </Text>
      {session.changedFiles.map((file) => {
        const hidden = folded.has(file.path) || viewed.has(file.path);
        return (
          <View key={file.path} className="border-t border-border">
            <View className="flex-row items-center gap-2 bg-muted/40 px-3 py-2">
              <Press onPress={() => setFolded(flip(folded, file.path))} className="flex-1 flex-row items-center gap-2" hoverClassName="">
                <View style={{ transform: [{ rotate: hidden ? '0deg' : '90deg' }] }}>
                  <ChevronRight size={14} color={colors.muted} />
                </View>
                <FileStatus file={file} />
                <Text className="flex-1 font-mono text-xs text-foreground" numberOfLines={1} ellipsizeMode="head">
                  {file.path}
                </Text>
                <Text style={{ color: colors.green }} className="text-xs">
                  +{file.added}
                </Text>
                <Text style={{ color: colors.red }} className="text-xs">
                  −{file.removed}
                </Text>
              </Press>
              <Press onPress={() => setViewed(flip(viewed, file.path))} className="flex-row items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5" hoverClassName="bg-muted">
                <View className={`h-3.5 w-3.5 items-center justify-center rounded-sm border ${viewed.has(file.path) ? 'border-blue-500 bg-blue-500' : 'border-border'}`}>
                  {viewed.has(file.path) ? <Check size={10} color="#fff" /> : null}
                </View>
                <Text className="text-xs text-muted-foreground">Viewed</Text>
              </Press>
            </View>
            {hidden ? null : (
              <View className="px-2 pt-2">
                <Diff lines={file.diff} />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function FileStatus({ file }: { file: ChangedFile }) {
  return <Text className="w-3 text-xs font-semibold text-muted-foreground">{file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M'}</Text>;
}

// One edit from the Feed: its path, then Diff or the File as the edit left it.
function EditDiff({ content }: { content: Extract<InspectorContent, { kind: 'edit' }> }) {
  const colors = useColors();
  const [view, setView] = useState<'diff' | 'file'>('diff');
  const file = content.lines.filter((line) => !line.startsWith('-') && !line.startsWith('@@')).map((line) => (line.startsWith('+') ? line.slice(1) : line.slice(line.startsWith(' ') ? 1 : 0)));
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 border-b border-border px-3 py-2">
        <Text className="flex-1 font-mono text-xs text-foreground" numberOfLines={1} ellipsizeMode="head">
          {content.path}
        </Text>
        <Text style={{ color: colors.green }} className="text-xs">
          +{content.added}
        </Text>
        <Text style={{ color: colors.red }} className="text-xs">
          −{content.removed}
        </Text>
        <Press onPress={() => setView(view === 'diff' ? 'file' : 'diff')} className="rounded-md border border-border px-2 py-0.5" hoverClassName="bg-muted">
          <Text className="text-xs text-foreground">{view === 'diff' ? 'File' : 'Diff'}</Text>
        </Press>
      </View>
      <ScrollView contentContainerClassName="p-2">
        <Diff lines={view === 'diff' ? content.lines : file} />
      </ScrollView>
    </View>
  );
}
