// PROTOTYPE: Issues. Tracker Integrations register views; the desktop sidebar and the phone's Issues screen list them by Project.
import { ChevronLeft, ChevronRight, Circle, CircleCheck, CircleDashed, CircleDot, CircleSlash, Inbox } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_OPEN, viewsFor } from './fixtures';
import { TargetRows } from './projects';
import { SessionRow } from './session-list';
import { GroupRow, ListHeader, ProjectGroups, WriteButton } from './sidebar';
import { actions, getState, useStore } from './store';
import type { Issue, IssueCategory, IssueView, Project } from './types';
import { go, OptionRow, Press, useBase, useColors, useWide } from './ui';

const CATEGORY_ORDER: IssueCategory[] = ['triage', 'started', 'todo', 'backlog', 'done', 'cancelled'];

export function getIssue(id: string) {
  return getState().issues.find((t) => t.id === id);
}

export function getView(id: string | undefined): IssueView {
  if (!id || id === ALL_OPEN.id) return ALL_OPEN;
  return getState().projects.flatMap(viewsFor).find((v) => v.id === id) ?? ALL_OPEN;
}

export function viewCaption(view: IssueView) {
  if (!view.project) return 'Every Project';
  const project = getState().projects.find((p) => p.name === view.project);
  return `${view.project} · ${project?.tracker?.kind === 'linear' ? 'Linear' : 'GitHub Issues'}`;
}

function StatusIcon({ category, size = 15 }: { category: IssueCategory; size?: number }) {
  const colors = useColors();
  if (category === 'done') return <CircleCheck size={size} color={colors.blue} />;
  if (category === 'cancelled') return <CircleSlash size={size} color={colors.muted} />;
  if (category === 'started') return <CircleDashed size={size} color={colors.amber} />;
  if (category === 'triage') return <Inbox size={size} color={colors.muted} />;
  return <Circle size={size} color={colors.muted} />;
}

// The views list: the desktop Issues sidebar and the phone's Issues screen. "All open" spans Projects, so it sits above them.
export function IssueViews({ style, selectedId, leading }: { style: 'sidebar' | 'phone'; selectedId?: string; leading?: ReactNode }) {
  const base = useBase();
  const colors = useColors();
  const projects = useStore((s) => s.projects);
  const issues = useStore((s) => s.issues);
  const [query, setQuery] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const phone = style === 'phone';
  const count = (view: IssueView) => issues.filter(view.match).length;
  const matches = (text: string) => !query || text.toLowerCase().includes(query.toLowerCase());
  const shown = (project: Project) => viewsFor(project).filter((view) => (matches(view.name) || matches(project.name)) && (!hideEmpty || count(view) > 0));
  const names = projects.filter((p) => !query || shown(p).length > 0).map((p) => p.name);
  const open = (view: IssueView) => go(`${base}/view/${encodeURIComponent(view.id)}`);
  const trailing = (view: IssueView) => (
    <>
      <Text className="font-mono text-xs text-muted-foreground">{count(view)}</Text>
      {phone ? <ChevronRight size={16} color={colors.muted} /> : null}
    </>
  );
  return (
    <View className="flex-1">
      <ListHeader
        title="Issues"
        phone={phone}
        leading={leading}
        search={{ query, onQuery: setQuery, placeholder: 'Search views' }}
        filter={{
          active: hideEmpty,
          content: (close) => (
            <>
              <OptionRow label="Every view" selected={!hideEmpty} onPress={() => (setHideEmpty(false), close())} />
              <OptionRow label="Views with Issues" selected={hideEmpty} onPress={() => (setHideEmpty(true), close())} />
            </>
          ),
        }}
      />
      <ScrollView contentContainerClassName={phone ? 'px-2 pb-28' : 'px-2 pb-20'} keyboardShouldPersistTaps="handled">
        {matches(ALL_OPEN.name) ? (
          <Press
            onPress={() => open(ALL_OPEN)}
            className={`mb-2 flex-row items-center gap-2.5 rounded-lg px-2.5 ${phone ? 'py-2.5' : 'py-1.5'} ${!phone && selectedId === ALL_OPEN.id ? 'bg-sidebar-accent' : ''}`}
            hoverClassName="bg-sidebar-accent"
          >
            <CircleDot size={phone ? 18 : 16} color={colors.muted} />
            <Text className={`flex-1 font-medium text-foreground ${phone ? 'text-base' : 'text-[15px]'}`}>{ALL_OPEN.name}</Text>
            {trailing(ALL_OPEN)}
          </Press>
        ) : null}
        <ProjectGroups phone={phone} names={names}>
          {(name) => {
            const project = projects.find((p) => p.name === name)!;
            if (!project.tracker) {
              return <GroupRow phone={phone} label="Set up Issues…" tone={colors.blue} onPress={() => go(`${base}/projects/${name}`)} />;
            }
            let group: string | undefined;
            return shown(project).map((view) => {
              const label = view.group !== group ? view.group : undefined;
              group = view.group;
              return (
                <View key={view.id}>
                  {label ? <Text className={`pt-2 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase ${phone ? 'pl-10' : 'pl-9'}`}>{label}</Text> : null}
                  <GroupRow phone={phone} selected={!phone && view.id === selectedId} label={view.name} detail={view.detail} trailing={trailing(view)} onPress={() => open(view)} />
                </View>
              );
            });
          }}
        </ProjectGroups>
      </ScrollView>
      <WriteButton phone={phone} label="New Issue" onPress={() => go(`${base}/new-issue`)} />
    </View>
  );
}

// One view's Issues. A Project's view groups by the tracker's status; "All open" groups by Project.
export function IssueViewList({ view, style, onOpen }: { view: IssueView; style: 'sidebar' | 'phone'; onOpen: (id: string) => void }) {
  const phone = style === 'phone';
  const issues = useStore((s) => s.issues).filter(view.match);
  const groups: { title: string; issues: Issue[] }[] = view.project
    ? [...new Set([...issues].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)).map((i) => i.status))].map((status) => ({
        title: status,
        issues: issues.filter((i) => i.status === status),
      }))
    : [...new Set(issues.map((i) => i.project))].map((project) => ({ title: project, issues: issues.filter((i) => i.project === project) }));
  return (
    <ScrollView contentContainerClassName={phone ? 'px-2 pb-6' : 'px-2 pb-4'}>
      {groups.map((group) => (
        <View key={group.title} className="mb-3">
          {group.title ? (
            <Text className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground">
              {group.title} · {group.issues.length}
            </Text>
          ) : null}
          {group.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} onOpen={onOpen} phone={phone} />
          ))}
        </View>
      ))}
      {issues.length === 0 ? <Text className="px-4 py-8 text-center text-sm text-muted-foreground">No Issues in this view.</Text> : null}
    </ScrollView>
  );
}

function IssueRow({ issue, onOpen, phone }: { issue: Issue; onOpen: (id: string) => void; phone: boolean }) {
  return (
    <Press onPress={() => onOpen(issue.id)} className={`flex-row items-center gap-2.5 rounded-lg px-2.5 ${phone ? 'py-3' : 'py-2'}`} hoverClassName="bg-sidebar-accent">
      <StatusIcon category={issue.category} size={phone ? 17 : 15} />
      <Text className="w-12 text-xs text-muted-foreground">{issue.number}</Text>
      <Text className={`flex-1 text-foreground ${phone ? 'text-base' : 'text-[15px]'}`} numberOfLines={1}>
        {issue.title}
      </Text>
      {!phone && issue.milestone ? <Text className="text-xs text-muted-foreground">{issue.milestone}</Text> : null}
    </Press>
  );
}

export function IssueScreen({ id, onBack, onOpenSession }: { id: string; onBack?: () => void; onOpenSession: (id: string) => void }) {
  const issue = useStore((s) => s.issues.find((t) => t.id === id));
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const sessions = useStore((s) => s.sessions);
  if (!issue) return <Text className="p-8 text-muted-foreground">No Issue {id}</Text>;
  const linked = sessions.filter((s) => issue.sessionIds.includes(s.id));
  const linkedSessions = (
    <>
      <Text className="mt-8 mb-1 text-xs font-semibold tracking-wide text-muted-foreground">Sessions · {linked.length}</Text>
      {linked.length ? (
        linked.map((s) => <SessionRow key={s.id} session={s} selected={false} onOpen={onOpenSession} phone={!wide} />)
      ) : (
        <Text className="text-sm text-muted-foreground">No Sessions yet.</Text>
      )}
    </>
  );
  // Desktop follows old Argo: the detail replaces the backlog in the pane, with a back link and a Properties column.
  if (wide) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-2.5">
          <Press onPress={onBack} className="flex-row items-center gap-1 rounded-md py-1 pr-2" hoverClassName="bg-muted">
            <ChevronLeft size={16} color={colors.muted} />
            <Text className="text-sm font-medium text-foreground">Back</Text>
          </Press>
        </View>
        <ScrollView contentContainerClassName="flex-row flex-wrap gap-10 px-8 pt-4 pb-8" contentContainerStyle={{ maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
          <View className="min-w-[320px] flex-1">
            <Text className="text-2xl font-semibold text-foreground">
              {issue.number} - {issue.title}
            </Text>
            <Text className="mt-4 text-base leading-6 text-foreground">{issue.body}</Text>
            {linkedSessions}
          </View>
          <View className="w-64 gap-3">
            <Text className="text-xs font-semibold tracking-wide text-muted-foreground">Properties</Text>
            <Property name="Status">
              <StatusIcon category={issue.category} size={14} />
              <Text className="text-sm text-foreground">{issue.status}</Text>
            </Property>
            <Property name="Project">
              <Text className="text-sm text-foreground">{issue.project}</Text>
            </Property>
            {issue.cycle ? (
              <Property name="Cycle">
                <Text className="text-sm text-foreground">Cycle {issue.cycle}</Text>
              </Property>
            ) : null}
            {issue.milestone ? (
              <Property name="Milestone">
                <Text className="text-sm text-foreground">{issue.milestone}</Text>
              </Property>
            ) : null}
            <Property name="Sessions">
              <Text className="text-sm text-foreground">{linked.length}</Text>
            </Property>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-1 px-2 py-1.5">
        <Press onPress={onBack} className="rounded-lg py-2 pr-1" hoverClassName="bg-muted">
          <ChevronLeft size={24} color={colors.foreground} />
        </Press>
        <Text className="flex-1 text-[15px] font-semibold text-foreground" numberOfLines={1}>
          {issue.number}
        </Text>
      </View>
      <ScrollView contentContainerClassName="px-4 pt-2 pb-8">
        <Text className="text-2xl font-semibold text-foreground">{issue.title}</Text>
        <View className="mt-2 flex-row items-center gap-1.5">
          <StatusIcon category={issue.category} size={14} />
          <Text className="text-sm text-muted-foreground">
            {issue.status} · {issue.project}
            {issue.milestone ? ` · ${issue.milestone}` : ''}
          </Text>
        </View>
        <Text className="mt-4 text-base leading-6 text-foreground">{issue.body}</Text>
        {linkedSessions}
      </ScrollView>
    </View>
  );
}

function Property({ name, children }: { name: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center">
      <Text className="w-24 text-sm text-muted-foreground">{name}</Text>
      <View className="flex-1 flex-row items-center gap-1.5">{children}</View>
    </View>
  );
}

// Desktop main pane for one view; the Issue detail replaces it, as in old Argo.
export function IssueViewPane({ viewId, onOpen }: { viewId?: string; onOpen: (id: string) => void }) {
  const view = getView(viewId);
  useStore((s) => s.projects);
  const count = useStore((s) => s.issues).filter(view.match).length;
  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-baseline gap-3 px-4 py-3">
        <Text className="text-[15px] font-semibold text-foreground">{view.name}</Text>
        <Text className="flex-1 text-xs text-muted-foreground">{viewCaption(view)}</Text>
        <Text className="text-xs text-muted-foreground">
          {count} {count === 1 ? 'Issue' : 'Issues'}
        </Text>
      </View>
      <View className="flex-1 px-2" style={{ maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
        <IssueViewList view={view} style="sidebar" onOpen={onOpen} />
      </View>
    </View>
  );
}

// A new Issue goes to its Project's tracker, so the picker lists only Projects that have one.
export function NewIssue({ initial, onBack, onCreated }: { initial?: string; onBack: () => void; onCreated: (id: string) => void }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const projects = useStore((s) => s.projects);
  const [name, setName] = useState(initial ?? projects.find((p) => p.tracker)?.name);
  const project = projects.find((p) => p.name === name);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  if (!project?.tracker) return <Text className="p-8 text-muted-foreground">No Project has an issue tracker yet</Text>;
  const where = project.tracker.kind === 'linear' ? `Linear · ${project.tracker.team}` : `GitHub Issues · ${project.repository?.slug}`;
  const create = () => title.trim() && onCreated(actions.createIssue(project, title.trim(), body.trim()));
  const fields = (
    <>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus={Platform.OS === 'web'}
        placeholder="Issue title"
        placeholderTextColor={colors.muted}
        className="text-2xl font-semibold text-foreground"
        style={{ outlineStyle: 'none' } as object}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Add a description…"
        placeholderTextColor={colors.muted}
        className="mt-3 min-h-32 text-base leading-6 text-foreground"
        style={{ outlineStyle: 'none', textAlignVertical: 'top' } as object}
      />
    </>
  );
  if (wide) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView contentContainerClassName="px-8 pt-8 pb-10" contentContainerStyle={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          <View className="-ml-2 mb-4">
            <TargetRows title="Create the Issue in" project={project.name} onProject={setName} only={(p) => !!p.tracker} />
          </View>
          {fields}
          <Text className="mt-2 text-xs text-muted-foreground">Goes to {where}</Text>
          <View className="mt-6 flex-row justify-end gap-2">
            <Press onPress={onBack} className="rounded-lg px-3 py-1.5" hoverClassName="bg-muted">
              <Text className="text-sm text-foreground">Cancel</Text>
            </Press>
            <Press onPress={create} disabled={!title.trim()} className={`rounded-lg bg-primary px-3 py-1.5 ${title.trim() ? '' : 'opacity-40'}`} hoverClassName="opacity-90">
              <Text style={{ color: colors.background }} className="text-sm font-medium">
                Create Issue
              </Text>
            </Press>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 py-1.5">
        <Press onPress={onBack} className="rounded-lg p-2" hoverClassName="">
          <Text className="text-base text-blue-500">Cancel</Text>
        </Press>
        <Text className="flex-1 text-center text-[15px] font-semibold text-foreground">New Issue</Text>
        <Press onPress={create} disabled={!title.trim()} className="rounded-lg p-2" hoverClassName="">
          <Text style={{ color: title.trim() ? colors.blue : colors.muted }} className="text-base font-semibold">
            Create
          </Text>
        </Press>
      </View>
      <ScrollView contentContainerClassName="px-4 pt-2 pb-8" keyboardShouldPersistTaps="handled">
        <View className="-ml-2 mb-3">
          <TargetRows title="Create the Issue in" project={project.name} onProject={setName} only={(p) => !!p.tracker} />
        </View>
        {fields}
        <Text className="mt-2 text-xs text-muted-foreground">Goes to {where}</Text>
      </ScrollView>
    </View>
  );
}
