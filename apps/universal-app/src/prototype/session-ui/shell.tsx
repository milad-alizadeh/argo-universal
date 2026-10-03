// PROTOTYPE: the desktop shell, the event log, the toast, the phone's pushed list screen and the draft Session.
import { usePathname, useGlobalSearchParams } from 'expo-router';
import { ChevronLeft, CircleDot, MessagesSquare, PanelLeft, Settings, Workflow } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Composer, type Draft } from './composer';
import { SessionList } from './session-list';
import { AtlasList } from './atlas';
import { IssueViews } from './issues';
import { TargetRows } from './projects';
import { SettingsNav } from './settings';
import { actions, catalogFor, getState, useStore } from './store';
import { go, Press, useBase, useColors, useWide } from './ui';

export type Section = 'sessions' | 'issues' | 'atlas' | 'settings';

export function sectionOf(pathname: string): Section {
  if (/\/(issues?|view|new-issue)(\/|$)/.test(pathname)) return 'issues';
  if (/\/(atlas|resource)(\/|$)/.test(pathname)) return 'atlas';
  if (/\/(settings|accounts|projects)(\/|$)/.test(pathname)) return 'settings';
  return 'sessions';
}

// Desktop: rail, the section's list in the sidebar, and the detail pane.
export function DesktopShell({ children }: { children: ReactNode }) {
  const colors = useColors();
  const base = useBase();
  const pathname = usePathname();
  const section = sectionOf(pathname);
  const { id, view, name, project } = useGlobalSearchParams<{ id?: string; view?: string; name?: string; project?: string }>();
  const [sidebar, setSidebar] = useState(true);
  const rail: { key: Section; Icon: typeof CircleDot; href: string }[] = [
    { key: 'sessions', Icon: MessagesSquare, href: `${base}/session/${firstSessionId()}` },
    { key: 'issues', Icon: CircleDot, href: `${base}/issues` },
    { key: 'atlas', Icon: Workflow, href: `${base}/atlas` },
  ];
  return (
    <View className="flex-1 flex-row bg-sidebar">
      <View className="w-14 items-center gap-1 pt-3 pb-4">
        <Press onPress={() => setSidebar(!sidebar)} className="mb-3 rounded-lg p-2" hoverClassName="bg-sidebar-accent">
          <PanelLeft size={17} color={colors.muted} />
        </Press>
        {rail.map(({ key, Icon, href }) => (
          <Press key={key} onPress={() => go(href)} className={`rounded-lg p-2.5 ${section === key ? 'bg-sidebar-accent' : ''}`} hoverClassName="bg-sidebar-accent">
            <Icon size={18} color={section === key ? colors.foreground : colors.muted} />
          </Press>
        ))}
        <View className="flex-1" />
        <Press onPress={() => go(`${base}/settings`)} className={`rounded-lg p-2.5 ${section === 'settings' ? 'bg-sidebar-accent' : ''}`} hoverClassName="bg-sidebar-accent">
          <Settings size={18} color={section === 'settings' ? colors.foreground : colors.muted} />
        </Press>
      </View>
      {sidebar ? (
        <View className="w-[340px] pt-2">
          {section === 'sessions' ? <SessionList style="sidebar" selectedId={id} onOpen={(next) => go(`${base}/session/${next}`)} onNew={() => go(`${base}/new`)} /> : null}
          {section === 'issues' ? <IssueViews style="sidebar" selectedId={view ? decodeURIComponent(view) : pathname.endsWith('/issues') ? 'all' : undefined} /> : null}
          {section === 'atlas' ? <AtlasList style="sidebar" selected={{ project, id }} /> : null}
          {section === 'settings' ? (
            <>
              <View className="h-9 flex-row items-center px-3 pb-2">
                <Text className="px-2 text-sm font-semibold text-foreground">Settings</Text>
              </View>
              <SettingsNav style="sidebar" selected={pathname.includes('/projects/') ? name : 'accounts'} />
            </>
          ) : null}
        </View>
      ) : null}
      <View className="my-2 mr-2 flex-1 overflow-hidden rounded-xl border border-border bg-background">{children}</View>
    </View>
  );
}

export function NewSession({ onCreated, onBack }: { onCreated: (id: string) => void; onBack?: () => void }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const claude = catalogFor('claude');
  const { project } = useGlobalSearchParams<{ project?: string }>();
  const [draft, setDraft] = useState<Draft>({ project: project ?? getState().projects[0]!.name, agent: 'claude', mode: claude.modes[0]!.id, model: claude.models[0]!.id, effort: 'Medium', checkout: 'worktree', from: null });
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" style={{ paddingTop: wide ? 0 : insets.top }}>
      {wide ? null : (
        <View className="flex-row items-center px-2 py-1.5">
          <Press onPress={onBack} className="rounded-lg p-2" hoverClassName="bg-muted">
            <ChevronLeft size={24} color={colors.foreground} />
          </Press>
        </View>
      )}
      <View className="flex-1 items-center justify-center px-6">
        {wide ? <Text className="text-2xl font-semibold text-foreground">What should we work on?</Text> : null}
      </View>
      <View className={wide ? 'px-8 pb-6' : 'px-2'} style={wide ? { maxWidth: 820, width: '100%', alignSelf: 'center' } : { paddingBottom: Math.max(insets.bottom, 8) }}>
        <TargetRows title="Start the Session in" project={draft.project} onProject={(next) => setDraft({ ...draft, project: next })} />
        <Composer draft={draft} onDraft={setDraft} onSend={(text) => onCreated(actions.create(draft, text))} />
      </View>
    </KeyboardAvoidingView>
  );
}

// Floating, dev-only: the last store events, so each action shows what it changed.
export function EventLog() {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const log = useStore((s) => s.log);
  const [open, setOpen] = useState(false);
  if (!__DEV__) return null;
  if (!open) {
    return (
      <Press onPress={() => setOpen(true)} className="absolute right-1 h-7 items-center justify-center rounded-full bg-black/60 px-2" style={{ top: '42%' }} hoverClassName="">
        <Text className="text-[11px] font-bold text-white">log</Text>
      </Press>
    );
  }
  return (
    <View pointerEvents="box-none" className="absolute right-0 left-0 items-center" style={wide ? { bottom: 14 } : { top: insets.top + 52 }}>
      <Press onPress={() => setOpen(false)} className="max-w-[90%] gap-0.5 rounded-2xl bg-black/85 px-3 py-2 shadow-lg shadow-black/30" hoverClassName="">
        {(log.length ? log.slice(0, 3) : ['No events yet']).map((line, index) => (
          <Text key={`${index}${line}`} className={`text-xs ${index ? 'text-white/50' : 'text-white'}`} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </Press>
    </View>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" className="absolute right-0 left-0 items-center" style={{ bottom: insets.bottom + 150 }}>
      <View className="flex-row items-center gap-4 rounded-xl bg-neutral-900 px-4 py-3 shadow-lg shadow-black/30">
        <Text className="text-sm text-white">{toast.text}</Text>
        {toast.undo ? (
          <Press onPress={toast.undo} hoverClassName="">
            <Text className="text-sm font-semibold text-blue-400">Undo</Text>
          </Press>
        ) : null}
      </View>
    </View>
  );
}

export function firstSessionId() {
  return getState().sessions.find((s) => !s.archived)?.id ?? 'survey';
}

// A pushed phone list with a large title; `left` and `right` sit beside it.
export function ListScreen({ title, caption, left, right, children }: { title: string; caption?: string; left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-end gap-2 px-4 pt-2 pb-2">
        {left}
        <View className="flex-1">
          {caption ? <Text className="text-xs text-muted-foreground">{caption}</Text> : null}
          <Text className="text-3xl font-bold text-foreground">{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
