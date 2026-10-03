// PROTOTYPE: the Session screen. The phone header keeps only back, title, plan and a ⋯ menu.
import {
  Archive,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileDiff,
  GitBranch,
  ListChecks,
  Menu,
} from 'lucide-react-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Composer, RequestCard } from './composer';
import { Diff, Feed, LiveHeader, OpenWorkContext } from './feed';
import { Inspector, InspectorContext, type InspectorContent, InspectorToggles } from './inspector';
import { type ActionsStep, SessionActions } from './session-actions';
import { actions, useSession, useStore } from './store';
import type { ChangedFile, Session } from './types';
import { type Anchor, Overlay, Press, StatusMark, stateLabel, useAnchor, useColors, useNow, useWide } from './ui';
import { WorkButtons, WorkSheet } from './work';

export function SessionScreen({
  id,
  onBack,
}: {
  id: string;
  onBack?: () => void;
}) {
  const session = useSession(id);
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const [inspector, setInspector] = useState<InspectorContent | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [work, setWork] = useState<string | null>(null);
  useEffect(() => {
    actions.markRead(id);
    setInspector(null);
    setExpanded(false);
    setWork(null);
  }, [id]);
  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">No Session {id}</Text>
      </View>
    );
  }
  if (wide) {
    const toggles = (
      <InspectorToggles
        open={inspector !== null}
        expanded={expanded}
        onToggle={() => (setInspector(inspector ? null : { kind: 'files' }), setExpanded(false))}
        onExpand={() => setExpanded(!expanded)}
      />
    );
    const openWork = (next: string) => (setInspector({ kind: 'work', id: next }), setExpanded(false));
    const workButtons = <WorkButtons session={session} phone={false} selectedId={inspector?.kind === 'work' ? inspector.id : undefined} onOpen={openWork} />;
    return (
      <InspectorContext.Provider value={setInspector}>
        <OpenWorkContext.Provider value={openWork}>
        <View className="flex-1 bg-background">
          <DesktopHeader session={session} toggles={toggles} work={workButtons} onFiles={() => setInspector({ kind: 'files' })} />
          <View className="flex-1 flex-row">
            {inspector && expanded ? null : (
              <View className="flex-1">
                <Body session={session} />
              </View>
            )}
            {inspector ? <Inspector session={session} content={inspector} expanded={expanded} /> : null}
          </View>
        </View>
        </OpenWorkContext.Provider>
      </InspectorContext.Provider>
    );
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <PhoneHeader session={session} onBack={onBack} />
      <OpenWorkContext.Provider value={setWork}>
        <Body session={session} work={<WorkButtons session={session} phone onOpen={setWork} />} />
      </OpenWorkContext.Provider>
      <WorkSheet session={session} id={work} onClose={() => setWork(null)} />
    </KeyboardAvoidingView>
  );
}

function Body({ session, work }: { session: Session; work?: ReactNode }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const atBottom = useRef(true);
  const [behind, setBehind] = useState(false);
  const running = session.state === 'running';
  const now = useNow(running);
  return (
    <View className={`flex-1 ${wide ? 'mx-3 mb-3 overflow-hidden rounded-xl border border-border' : ''}`}>
      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerClassName={wide ? 'px-8 pt-4 pb-6' : 'px-4 pt-3 pb-4'}
        contentContainerStyle={wide ? { maxWidth: 820, width: '100%', alignSelf: 'center' } : undefined}
        stickyHeaderIndices={wide && session.plan.length ? [0] : undefined}
        scrollEventThrottle={32}
        keyboardDismissMode="interactive"
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
          if (atBottom.current) setBehind(false);
        }}
        onContentSizeChange={() => {
          if (atBottom.current) scroll.current?.scrollToEnd({ animated: false });
          else setBehind(true);
        }}
      >
        {wide && session.plan.length ? <PlanPanel session={session} /> : null}
        <Feed rows={session.feed} />
        {running ? (
          <View className="mt-4">
            <LiveHeader activity={session.activity} startedAt={session.turnStartedAt} now={now} compact={!wide} />
          </View>
        ) : null}
      </ScrollView>
      {behind ? (
        <Press
          onPress={() => {
            scroll.current?.scrollToEnd({ animated: true });
            setBehind(false);
          }}
          className="absolute self-center flex-row items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm shadow-black/10"
          style={{ bottom: 150 }}
        >
          <ArrowDown size={13} color="#737373" />
          <Text className="text-xs text-foreground">Latest</Text>
        </Press>
      ) : null}
      <View className={wide ? 'px-8 pb-4' : 'px-2 pt-1'} style={wide ? { maxWidth: 820, width: '100%', alignSelf: 'center' } : { paddingBottom: Math.max(insets.bottom, 8) }}>
        {work ? <View className="mb-2 flex-row px-1">{work}</View> : null}
        {session.archived ? (
          <View className="flex-row items-center justify-center gap-2 rounded-xl bg-muted py-3">
            <Archive size={14} color="#737373" />
            <Text className="text-sm text-muted-foreground">Archived · read-only. The branch {session.branch} is kept.</Text>
          </View>
        ) : session.request ? (
          <RequestCard session={session} request={session.request} />
        ) : (
          <Composer session={session} />
        )}
      </View>
    </View>
  );
}

function PlanPanel({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const done = session.plan.filter((p) => p.status === 'completed').length;
  return (
    <View className="mb-3 bg-background pb-1">
      <View className="rounded-xl border border-border bg-background px-3 py-2">
        <Press onPress={() => setOpen(!open)} className="flex-row items-center gap-2" hoverClassName="">
          <ListChecks size={15} color={colors.muted} />
          <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
            {open ? `${done} out of ${session.plan.length} tasks completed` : (session.plan.find((p) => p.status === 'in_progress')?.text ?? 'Plan')}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {done}/{session.plan.length}
          </Text>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={15} color={colors.muted} />
          </View>
        </Press>
        {open ? (
          <View className="gap-1.5 pt-2 pb-1">
            {session.plan.map((p, index) => (
              <Text
                key={p.text}
                className={`text-sm ${p.status === 'completed' ? 'text-muted-foreground line-through' : p.status === 'in_progress' ? 'font-medium text-foreground' : 'text-foreground'}`}
              >
                {index + 1}. {p.text}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DesktopHeader({ session, toggles, work, onFiles }: { session: Session; toggles: ReactNode; work: ReactNode; onFiles: () => void }) {
  const colors = useColors();
  const [step, setStep] = useState<ActionsStep>(null);
  const [menuRef, measure] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <View className="flex-1 gap-0.5">
        <Press onPress={() => setStep('rename')} className="flex-row items-center gap-2 self-start rounded-md" hoverClassName="">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {session.title}
          </Text>
          <Text className="text-xs text-muted-foreground">{stateLabel(session)}</Text>
        </Press>
        <View className="flex-row items-center gap-1.5">
          <GitBranch size={12} color={colors.muted} />
          <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
            {session.checkout === 'worktree' ? `~/Developer/argo/.argo/worktrees/${session.branch.replace('argo/', '')}` : '~/Developer/argo'} · {session.branch}
          </Text>
        </View>
      </View>
      {work}
      <ChangedFilesChip session={session} onPress={onFiles} />
      <View ref={menuRef}>
        <Press
          onPress={async () => {
            setAnchor(await measure());
            setStep('menu');
          }}
          className="rounded-md p-1.5"
          hoverClassName="bg-muted"
        >
          <Ellipsis size={17} color={colors.muted} />
        </Press>
      </View>
      {toggles}
      <SessionActions id={session.id} step={step} setStep={setStep} anchor={anchor} />
    </View>
  );
}

function PhoneHeader({ session, onBack }: { session: Session; onBack?: () => void }) {
  const colors = useColors();
  const [step, setStep] = useState<ActionsStep>(null);
  const [files, setFiles] = useState(false);
  const [plan, setPlan] = useState(false);
  const done = session.plan.filter((p) => p.status === 'completed').length;
  return (
    <View>
      <View className="flex-row items-center gap-1 px-2 py-1.5">
        <Press onPress={onBack} className="flex-row items-center rounded-lg py-2 pr-1" hoverClassName="bg-muted">
          <ChevronLeft size={24} color={colors.foreground} />
        </Press>
        <View className="flex-1 flex-row items-center gap-2 px-1">
          <StatusMark session={session} size={15} />
          <Text className="flex-1 text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {session.title}
          </Text>
        </View>
        {session.plan.length ? (
          <Press onPress={() => setPlan(true)} className="flex-row items-center gap-1 rounded-lg p-2" hoverClassName="bg-muted">
            <ListChecks size={19} color={colors.foreground} />
            <Text className="text-xs text-muted-foreground">
              {done}/{session.plan.length}
            </Text>
          </Press>
        ) : null}
        <Press onPress={() => setStep('menu')} className="rounded-lg p-2" hoverClassName="bg-muted">
          <Ellipsis size={19} color={colors.foreground} />
        </Press>
      </View>
      <SessionActions id={session.id} step={step} setStep={setStep} onFiles={() => setTimeout(() => setFiles(true), Platform.OS === 'ios' ? 400 : 0)} />
      <ChangedFilesOverlay session={session} open={files} onClose={() => setFiles(false)} />
      <Overlay open={plan} onClose={() => setPlan(false)} title={`Plan · ${done} of ${session.plan.length} done`} width={360}>
        <View className="gap-2 px-2.5 pb-3">
          {session.plan.map((p, index) => (
            <Text
              key={p.text}
              className={`text-base ${p.status === 'completed' ? 'text-muted-foreground line-through' : p.status === 'in_progress' ? 'font-medium text-foreground' : 'text-foreground'}`}
            >
              {index + 1}. {p.text}
            </Text>
          ))}
        </View>
      </Overlay>
    </View>
  );
}

// Opens the changed files in the right inspector, as old Argo does.
function ChangedFilesChip({ session, onPress }: { session: Session; onPress: () => void }) {
  const colors = useColors();
  if (!session.changedFiles.length) return null;
  const added = session.changedFiles.reduce((sum, f) => sum + f.added, 0);
  const removed = session.changedFiles.reduce((sum, f) => sum + f.removed, 0);
  return (
    <Press onPress={onPress} className="flex-row items-center gap-1.5 rounded-lg border border-border px-2 py-1" hoverClassName="bg-muted">
      <FileDiff size={13} color={colors.muted} />
      <Text className="text-xs text-foreground">{session.changedFiles.length}</Text>
      <Text style={{ color: colors.green }} className="text-xs">
        +{added}
      </Text>
      <Text style={{ color: colors.red }} className="text-xs">
        −{removed}
      </Text>
    </Press>
  );
}

function ChangedFilesOverlay({ session, open, onClose, anchor }: { session: Session; open: boolean; onClose: () => void; anchor?: Anchor }) {
  const colors = useColors();
  const [file, setFile] = useState<ChangedFile>();
  return (
    <Overlay
      open={open}
      onClose={() => {
        onClose();
        setFile(undefined);
      }}
      anchor={anchor}
      title={file ? undefined : `${session.changedFiles.length} files changed in ${session.branch}`}
      width={file ? 560 : 380}
    >
        {file ? (
          <View className="gap-2 px-1.5 pb-2">
            <Press onPress={() => setFile(undefined)} className="flex-row items-center gap-1 self-start rounded-md py-1" hoverClassName="">
              <ChevronLeft size={16} color={colors.blue} />
              <Text className="text-sm text-blue-500">Files</Text>
            </Press>
            <Text className="font-mono text-xs text-foreground" numberOfLines={1} ellipsizeMode="middle">
              {file.path}
            </Text>
            <ScrollView style={{ maxHeight: 420 }}>
              <Diff lines={file.diff} />
            </ScrollView>
          </View>
        ) : (
          session.changedFiles.map((f) => (
            <Press key={f.path} onPress={() => setFile(f)} className="flex-row items-center gap-2 rounded-lg px-2.5 py-2.5" hoverClassName="bg-muted">
              <Text className="w-4 text-xs font-semibold text-muted-foreground">{f.status === 'added' ? 'A' : f.status === 'deleted' ? 'D' : 'M'}</Text>
              <Text className="flex-1 font-mono text-xs text-foreground" numberOfLines={1} ellipsizeMode="head">
                {f.path}
              </Text>
              <Text style={{ color: colors.green }} className="text-xs">
                +{f.added}
              </Text>
              <Text style={{ color: colors.red }} className="text-xs">
                −{f.removed}
              </Text>
            </Press>
          ))
        )}
    </Overlay>
  );
}
