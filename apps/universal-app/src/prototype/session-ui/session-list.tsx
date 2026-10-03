// PROTOTYPE: the Session list and row, drawn after old Argo's row (session-row.tsx).
import { Bot, Ellipsis } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { type ActionsStep, SessionActions } from './session-actions';
import { ListHeader, ProjectGroups, WriteButton } from './sidebar';
import { actions, useStore } from './store';
import type { Session } from './types';
import { type Anchor, OptionRow, Press, StatusMark, useAnchor, useColors } from './ui';
import { running } from './work';

export type ListStyle = 'sidebar' | 'phone';

// Sessions under their Projects; the write button starts a new one.
export function SessionList({ style, selectedId, onOpen, onNew, leading }: { style: ListStyle; selectedId?: string; onOpen: (id: string) => void; onNew: () => void; leading?: ReactNode }) {
  const sessions = useStore((s) => s.sessions);
  const projects = useStore((s) => s.projects);
  const showArchived = useStore((s) => s.showArchived);
  const [query, setQuery] = useState('');
  const phone = style !== 'sidebar';
  const visible = sessions.filter((s) => s.archived === showArchived && (!query || s.title.toLowerCase().includes(query.toLowerCase())));
  // Empty Projects keep their heading, as in Codex, unless a search or the archive narrows the list.
  const names = projects.map((p) => p.name).filter((name) => (!query && !showArchived) || visible.some((s) => s.project === name));
  return (
    <View className="flex-1">
      <ListHeader
        title={showArchived ? 'Archived' : 'Sessions'}
        phone={phone}
        leading={leading}
        search={{ query, onQuery: setQuery, placeholder: 'Search Sessions' }}
        filter={{
          active: showArchived,
          content: (close) => (
            <>
              <OptionRow label="Active" selected={!showArchived} onPress={() => (actions.setShowArchived(false), close())} />
              <OptionRow label="Archived" selected={showArchived} onPress={() => (actions.setShowArchived(true), close())} />
            </>
          ),
        }}
      />
      <ScrollView contentContainerClassName={phone ? 'px-2 pb-28' : 'px-2 pb-20'} keyboardShouldPersistTaps="handled">
        <ProjectGroups phone={phone} names={names} count={(name) => visible.filter((s) => s.project === name).length}>
          {(name) => visible.filter((s) => s.project === name).map((s) => <SessionRow key={s.id} session={s} selected={s.id === selectedId} onOpen={onOpen} phone={phone} />)}
        </ProjectGroups>
        {names.length === 0 ? <Text className="px-4 py-8 text-center text-sm text-muted-foreground">{showArchived ? 'No archived Sessions.' : 'No Sessions found.'}</Text> : null}
      </ScrollView>
      <WriteButton phone={phone} label="New Session" onPress={onNew} />
    </View>
  );
}

export function SessionRow({
  session,
  selected,
  onOpen,
  phone,
}: {
  session: Session;
  selected: boolean;
  onOpen: (id: string) => void;
  phone: boolean;
}) {
  const colors = useColors();
  const [step, setStep] = useState<ActionsStep>(null);
  const [menuRef, measureMenu] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  const done = session.plan.filter((p) => p.status === 'completed').length;
  const openMenu = async () => {
    setAnchor(await measureMenu());
    setStep('menu');
  };
  return (
    <View ref={menuRef}>
      <Press
        onPress={() => onOpen(session.id)}
        onLongPress={openMenu}
        className={`flex-row gap-2.5 rounded-lg px-2.5 ${phone ? 'py-3' : 'py-2'} ${selected ? 'bg-sidebar-accent' : ''} ${session.archived ? 'opacity-70' : ''}`}
        hoverClassName="bg-sidebar-accent"
      >
        {({ hovered }) => (
          <>
            <View className="pt-0.5">
              <StatusMark session={session} size={phone ? 17 : 15} />
            </View>
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-2">
                <Text className={`flex-shrink font-medium text-foreground ${phone ? 'text-base' : 'text-[15px]'}`} numberOfLines={1}>
                  {session.title}
                </Text>
                {session.state === 'needs_input' ? <Badge text="Needs input" color={colors.amber} /> : null}
                {session.state === 'failed' ? <Badge text="Failed" color={colors.red} /> : null}
                {session.unread && session.state !== 'running' ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue }} /> : null}
              </View>
              <Text className={`text-muted-foreground ${phone ? 'text-sm' : 'text-[13px]'}`} numberOfLines={1}>
                {session.activity}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-2.5">
                {session.state === 'running' ? null : <Text className="text-xs text-muted-foreground">{session.updatedAt}</Text>}
                {session.plan.length ? (
                  <View className="flex-row items-center gap-1.5">
                    <View className="flex-row gap-0.5" style={{ width: 48 }}>
                      {session.plan.map((p, index) => (
                        <View
                          key={`${index}${p.text}`}
                          className="h-1 flex-1 rounded-full"
                          style={{ backgroundColor: p.status === 'completed' ? colors.muted : p.status === 'in_progress' ? colors.foreground : colors.border }}
                        />
                      ))}
                    </View>
                    <Text className="text-xs text-muted-foreground">
                      {done}/{session.plan.length}
                    </Text>
                  </View>
                ) : null}
                {session.subagents.length ? (
                  <View className="flex-row items-center gap-1">
                    <Bot size={12} color={colors.muted} />
                    <Text className="text-xs text-muted-foreground">
                      {running(session.subagents) ? `${running(session.subagents)}/` : ''}
                      {session.subagents.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {!phone && hovered ? (
              <Press onPress={openMenu} className="self-center rounded-md p-1" hoverClassName="bg-muted">
                <Ellipsis size={15} color={colors.muted} />
              </Press>
            ) : null}
          </>
        )}
      </Press>
      <SessionActions id={session.id} step={step} setStep={setStep} anchor={anchor} />
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}22` }} className="rounded px-1.5 py-px">
      <Text style={{ color }} className="text-[11px] font-medium">
        {text}
      </Text>
    </View>
  );
}
