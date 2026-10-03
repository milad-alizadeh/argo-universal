// PROTOTYPE: a Session's background work, as in old Argo: one button each for Subagents and Shells, with a count and a list.
import { Bot, ChevronDown, SquareTerminal } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feed } from './feed';
import type { Session, Shell, Subagent, WorkState } from './types';
import { type Anchor, duration, Overlay, Press, useAnchor, useColors } from './ui';

type Kind = 'subagents' | 'shells';

interface Entry {
  id: string;
  title: string;
  monospace: boolean;
  state: WorkState;
  facts: string;
  detail?: string;
}

export const running = (work: { state: WorkState }[]) => work.filter((w) => w.state === 'running').length;

const tokens = (count: number) => (count >= 1000 ? `${(count / 1000).toFixed(1)}k tokens` : `${count} tokens`);
const STATE_TEXT: Record<WorkState, string> = { running: 'Running', done: 'Finished', failed: 'Failed' };

function subagentEntry(subagent: Subagent): Entry {
  return { id: subagent.id, title: subagent.name, monospace: false, state: subagent.state, facts: [subagent.model, duration(subagent.seconds), tokens(subagent.tokens)].join(' · '), detail: subagent.prompt };
}

function shellEntry(shell: Shell): Entry {
  return { id: shell.id, title: shell.label ?? shell.command, monospace: !shell.label, state: shell.state, facts: duration(shell.seconds) };
}

function findWork(session: Session, id: string) {
  const subagent = session.subagents.find((s) => s.id === id);
  if (subagent) return { kind: 'subagents' as const, subagent, entry: subagentEntry(subagent) };
  const shell = session.shells.find((s) => s.id === id);
  if (shell) return { kind: 'shells' as const, shell, entry: shellEntry(shell) };
  return null;
}

function useStateColor() {
  const colors = useColors();
  return (state: WorkState) => (state === 'running' ? colors.green : state === 'failed' ? colors.red : colors.muted);
}

// Green while anything runs, grey when it has all ended.
function Count({ count, active, corner }: { count: number; active: boolean; corner?: boolean }) {
  const colors = useColors();
  return (
    <View
      pointerEvents="none"
      className={`items-center justify-center rounded-full px-1 ${corner ? 'absolute -top-0.5 -right-0.5 border-2 border-background' : ''}`}
      style={{ minWidth: corner ? 18 : 17, height: corner ? 18 : 17, backgroundColor: active ? colors.green : colors.muted }}
    >
      <Text className="text-[10px] font-bold text-white">{count}</Text>
    </View>
  );
}

export function WorkButtons({ session, phone, selectedId, onOpen }: { session: Session; phone: boolean; selectedId?: string; onOpen: (id: string) => void }) {
  if (!session.subagents.length && !session.shells.length) return null;
  return (
    <View className={`flex-row items-center ${phone ? 'gap-2' : 'gap-0.5'}`}>
      <WorkButton kind="subagents" entries={session.subagents.map(subagentEntry)} phone={phone} selectedId={selectedId} onOpen={onOpen} />
      <WorkButton kind="shells" entries={session.shells.map(shellEntry)} phone={phone} selectedId={selectedId} onOpen={onOpen} />
    </View>
  );
}

function WorkButton({ kind, entries, phone, selectedId, onOpen }: { kind: Kind; entries: Entry[]; phone: boolean; selectedId?: string; onOpen: (id: string) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [ref, measure] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  if (!entries.length) return null;
  const label = kind === 'subagents' ? 'Subagents' : 'Shells';
  const Icon = kind === 'subagents' ? Bot : SquareTerminal;
  const active = running(entries) > 0;
  const choose = (id: string) => {
    setOpen(false);
    // iOS cannot present the sheet until the popover's modal has gone.
    setTimeout(() => onOpen(id), Platform.OS === 'ios' && phone ? 350 : 0);
  };
  return (
    <View ref={ref} collapsable={false}>
      <Press
        onPress={async () => {
          setAnchor(await measure());
          setOpen(true);
        }}
        accessibilityLabel={`${label} · ${entries.length}`}
        className={phone ? 'flex-row items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2 pl-2.5' : 'rounded-md p-1.5'}
        hoverClassName="bg-muted"
      >
        <Icon size={phone ? 15 : 17} color={phone ? colors.foreground : colors.muted} />
        {phone ? (
          <>
            <Count count={entries.length} active={active} />
            <ChevronDown size={13} color={colors.muted} />
          </>
        ) : null}
      </Press>
      {phone ? null : <Count count={entries.length} active={active} corner />}
      <Overlay popover open={open} onClose={() => setOpen(false)} anchor={anchor} width={320}>
        <ScrollView style={{ maxHeight: 380 }}>
          <Group label="Running" entries={entries.filter((e) => e.state === 'running')} selectedId={selectedId} onPress={choose} />
          <Group label="Finished" entries={entries.filter((e) => e.state !== 'running')} selectedId={selectedId} onPress={choose} />
        </ScrollView>
      </Overlay>
    </View>
  );
}

function Group({ label, entries, selectedId, onPress }: { label: string; entries: Entry[]; selectedId?: string; onPress: (id: string) => void }) {
  const stateColor = useStateColor();
  if (!entries.length) return null;
  return (
    <View className="pb-1">
      <Text className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
        {label} · {entries.length}
      </Text>
      {entries.map((entry) => (
        <Press key={entry.id} onPress={() => onPress(entry.id)} className={`flex-row items-start gap-2.5 rounded-lg px-2.5 py-1.5 ${entry.id === selectedId ? 'bg-muted' : ''}`} hoverClassName="bg-muted">
          <View className="mt-1.5 rounded-full" style={{ width: 7, height: 7, backgroundColor: stateColor(entry.state) }} />
          <View className="flex-1">
            <Text className={`text-sm text-foreground ${entry.monospace ? 'font-mono text-xs' : 'font-medium'}`} numberOfLines={1}>
              {entry.title}
            </Text>
            {entry.detail ? (
              <Text className="text-xs text-foreground/80" numberOfLines={1}>
                {entry.detail}
              </Text>
            ) : null}
            <Text className="text-xs text-muted-foreground">
              {entry.state === 'failed' ? 'Failed · ' : ''}
              {entry.facts}
            </Text>
          </View>
        </Press>
      ))}
    </View>
  );
}

// The work's name and state, then what it did: a Subagent's Feed, or a Shell's output.
export function WorkHeader({ session, id }: { session: Session; id: string }) {
  const colors = useColors();
  const stateColor = useStateColor();
  const work = findWork(session, id);
  if (!work) return null;
  const Icon = work.kind === 'subagents' ? Bot : SquareTerminal;
  return (
    <View className="flex-1 flex-row items-center gap-2.5">
      <Icon size={17} color={colors.muted} />
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold text-foreground ${work.entry.monospace ? 'font-mono text-[13px]' : ''}`} numberOfLines={1}>
          {work.entry.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View className="rounded-full" style={{ width: 6, height: 6, backgroundColor: stateColor(work.entry.state) }} />
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {STATE_TEXT[work.entry.state]} · {work.entry.facts}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function WorkBody({ session, id }: { session: Session; id: string }) {
  const work = findWork(session, id);
  if (!work) return <Text className="p-4 text-sm text-muted-foreground">No work {id} in this Session.</Text>;
  if (work.kind === 'shells') {
    return (
      <View className="gap-3">
        <View className="rounded-lg bg-muted px-3 py-2">
          <Text className="font-mono text-xs text-foreground">$ {work.shell.command}</Text>
        </View>
        <View className="gap-0.5">
          {work.shell.output.map((line, index) => (
            <Text key={`${index}${line}`} className="font-mono text-xs text-muted-foreground">
              {line || ' '}
            </Text>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View className="gap-4">
      <View className="self-end rounded-2xl bg-muted px-4 py-2.5" style={{ maxWidth: '88%' }}>
        <Text className="text-[15px] leading-6 text-foreground">{work.subagent.prompt}</Text>
      </View>
      <Feed rows={work.subagent.rows} />
    </View>
  );
}

// On a phone a Subagent's Feed opens in a native sheet: a page sheet on iOS, full screen elsewhere.
export function WorkSheet({ session, id, onClose }: { session: Session; id: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  return (
    <Modal visible={id !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {id ? (
        <View className="flex-1 bg-background" style={{ paddingTop: ios ? 0 : insets.top }}>
          {ios ? <View className="mt-2 h-1 w-9 self-center rounded-full bg-border" /> : null}
          <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
            <WorkHeader session={session} id={id} />
            <Press onPress={onClose} className="rounded-lg px-2 py-1" hoverClassName="bg-muted">
              <Text className="text-base font-semibold text-blue-500">Done</Text>
            </Press>
          </View>
          <ScrollView contentContainerClassName="px-4 pt-4" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
            <WorkBody session={session} id={id} />
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}
