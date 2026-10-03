// PROTOTYPE: composer, pickers, context strip and the pinned request card.
import { ArrowUp, Check, ChevronDown, Cloud, Ellipsis, GitBranch, ImagePlus, Search, Square, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Switch, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { BRANCHES } from './fixtures';
import { actions, catalogFor } from './store';
import type { AgentId, Request, Session } from './types';
import { AgentLogo, type Anchor, Chip, ModeIcon, OptionRow, Overlay, Press, TONE_COLOR, useAnchor, useColors, useWide } from './ui';

export interface Draft {
  project: string;
  agent: AgentId;
  mode: string;
  model: string;
  effort: string;
  checkout: 'worktree' | 'main';
  // The branch a new worktree starts from; null is the main checkout's current branch.
  from: string | null;
}

type Picker = 'turn' | 'mode' | 'agent' | 'context' | null;

export function Composer({
  session,
  draft,
  onDraft,
  onSend,
}: {
  session?: Session;
  draft?: Draft;
  onDraft?: (draft: Draft) => void;
  onSend?: (text: string) => void;
}) {
  const wide = useWide();
  const colors = useColors();
  const config = (session ?? draft)!;
  const catalog = catalogFor(config.agent);
  const model = catalog.models.find((m) => m.id === config.model) ?? catalog.models[0]!;
  const mode = catalog.modes.find((m) => m.id === config.mode) ?? catalog.modes[0]!;
  const [text, setText] = useState('');
  const [images, setImages] = useState(0);
  const [picker, setPicker] = useState<Picker>(null);
  const [anchor, setAnchor] = useState<Anchor>();
  const [turnRef, measureTurn] = useAnchor<View>();
  const [modeRef, measureMode] = useAnchor<View>();
  const [agentRef, measureAgent] = useAnchor<View>();
  const [contextRef, measureContext] = useAnchor<View>();
  const running = session?.state === 'running';
  const open = async (which: Picker, measure: () => Promise<Anchor>) => {
    setAnchor(await measure());
    setPicker(which);
  };
  const set = (key: 'mode' | 'model' | 'effort', value: string) => {
    if (session) actions.setting(session.id, key, value);
    else if (draft && onDraft) onDraft({ ...draft, [key]: value });
  };
  const send = () => {
    if (!text.trim() || running) return;
    if (session) actions.send(session.id, text.trim(), images);
    onSend?.(text.trim());
    setText('');
    setImages(0);
  };

  return (
    <View>
      {draft && onDraft ? <WorktreeRow draft={draft} onDraft={onDraft} /> : null}
      <View className="z-10 rounded-2xl border border-border bg-background shadow-sm shadow-black/10">
        {images ? (
          <View className="flex-row gap-2 px-3 pt-3">
            {Array.from({ length: images }, (_, index) => (
              <View key={index} className="h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Text className="text-xs text-muted-foreground">img</Text>
              </View>
            ))}
          </View>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder={session ? (running ? 'Queue a follow-up after this Turn…' : 'Reply…') : 'What should the Agent do?'}
          placeholderTextColor={colors.muted}
          className={`px-4 pt-3 text-foreground ${wide ? 'min-h-[52px] text-[15px]' : 'min-h-[44px] text-base'}`}
          style={{ outlineStyle: 'none', maxHeight: 160 } as object}
          onKeyPress={(event) => {
            const key = event.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && key.key === 'Enter' && !key.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <View className="flex-row items-center gap-0.5 px-2 pt-1 pb-2">
          <Press onPress={() => setImages(model.images ? images + 1 : images)} className="rounded-md p-1.5" hoverClassName="bg-muted">
            <ImagePlus size={17} color={model.images ? colors.muted : colors.border} />
          </Press>
          {draft ? (
            <View ref={agentRef}>
              <Chip label={catalogFor(draft.agent).name} icon={<AgentLogo agent={draft.agent} size={14} />} onPress={() => open('agent', measureAgent)} />
            </View>
          ) : null}
          <View ref={turnRef} className="flex-shrink">
            <Chip
              label={wide ? `${model.name} · ${config.effort}` : model.name}
              icon={draft ? undefined : <AgentLogo agent={config.agent} size={14} />}
              onPress={() => open('turn', measureTurn)}
            />
          </View>
          <View className="flex-1" />
          <View ref={modeRef}>
            <Chip
              label={wide || !draft ? mode.name : ''}
              tone={mode.tone === 'dangerous' || mode.tone === 'planning' ? TONE_COLOR[mode.tone] : undefined}
              icon={<ModeIcon icon={mode.icon} color={mode.tone === 'dangerous' || mode.tone === 'planning' ? TONE_COLOR[mode.tone] : colors.muted} />}
              onPress={() => open('mode', measureMode)}
            />
          </View>
          {running ? (
            <Press onPress={() => session && actions.stop(session.id)} className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Square size={12} color={colors.background} fill={colors.background} />
            </Press>
          ) : (
            <Press onPress={send} className={`ml-1 h-8 w-8 items-center justify-center rounded-full ${text.trim() ? 'bg-primary' : 'bg-muted'}`}>
              <ArrowUp size={17} color={text.trim() ? colors.background : colors.muted} />
            </Press>
          )}
        </View>
      </View>
      {session ? (
        <View ref={contextRef} className="mx-3 -mt-2 flex-row items-center gap-4 rounded-b-xl border border-border border-t-0 bg-sidebar px-4 pt-3.5 pb-1.5">
          <Press onPress={() => open('context', measureContext)} className="flex-row items-center gap-1.5" hoverClassName="">
            <Cloud size={13} color={colors.muted} />
            <Text className="text-xs text-muted-foreground">Usage 8%</Text>
          </Press>
          <Press onPress={() => open('context', measureContext)} className="flex-row items-center gap-1.5" hoverClassName="">
            <Ring value={session.contextUsed} />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {wide ? `Context ${Math.round(session.contextUsed * 300)}k / 300k · ${Math.round(session.contextUsed * 100)}%` : `${Math.round(session.contextUsed * 100)}%`}
            </Text>
          </Press>
          {session.pendingSettings ? <Text className="text-xs text-muted-foreground">Changes apply next Turn</Text> : null}
          <View className="flex-1" />
          <Ellipsis size={14} color={colors.muted} />
        </View>
      ) : null}

      <Overlay open={picker === 'turn'} onClose={() => setPicker(null)} anchor={anchor} title="Model" width={300}>
        {catalog.models.map((m) => (
          <OptionRow key={m.id} label={m.name} detail={m.images ? undefined : 'No images'} selected={m.id === model.id} onPress={() => set('model', m.id)} />
        ))}
        <View className="mt-1 gap-2 border-border border-t px-2.5 pt-3 pb-2">
          <Text className="text-xs font-medium text-muted-foreground">Effort — more effort trades speed for deeper reasoning</Text>
          <View className="flex-row gap-1">
            {model.efforts.map((effort) => (
              <Press
                key={effort}
                onPress={() => set('effort', effort)}
                className={`flex-1 items-center rounded-md py-2 ${effort === config.effort ? 'bg-primary' : 'bg-muted'}`}
                hoverClassName=""
              >
                <Text className={`text-xs ${effort === config.effort ? 'font-semibold text-primary-foreground' : 'text-foreground'}`} numberOfLines={1}>
                  {effort.replace('Extra high', 'XHigh')}
                </Text>
              </Press>
            ))}
          </View>
        </View>
      </Overlay>
      <Overlay open={picker === 'mode'} onClose={() => setPicker(null)} anchor={anchor} title={`${catalog.name} permissions`} width={300}>
        {catalog.modes.map((m) => (
          <OptionRow
            key={m.id}
            label={m.name}
            detail={m.description}
            tone={m.tone === 'dangerous' ? TONE_COLOR.dangerous : undefined}
            icon={<ModeIcon icon={m.icon} color={m.tone === 'dangerous' || m.tone === 'planning' ? TONE_COLOR[m.tone] : colors.muted} size={16} />}
            selected={m.id === mode.id}
            onPress={() => {
              set('mode', m.id);
              setPicker(null);
            }}
          />
        ))}
      </Overlay>
      <Overlay open={picker === 'agent'} onClose={() => setPicker(null)} anchor={anchor} title="Agent" width={260}>
        {(['claude', 'codex'] as const).map((agent) => (
          <OptionRow
            key={agent}
            label={catalogFor(agent).name}
            detail="Installed · signed in"
            icon={<AgentLogo agent={agent} size={16} />}
            selected={draft?.agent === agent}
            onPress={() => {
              const c = catalogFor(agent);
              onDraft?.({ ...draft!, agent, mode: c.modes[0]!.id, model: c.models[0]!.id, effort: 'Medium' });
              setPicker(null);
            }}
          />
        ))}
      </Overlay>
      <Overlay open={picker === 'context'} onClose={() => setPicker(null)} anchor={anchor} title={`${catalog.name} plan usage`} width={300}>
        <View className="gap-3 px-2.5 pb-2">
          <Meter label="5-hour limit" value={0.08} detail="Resets in 4 hr 5 min" />
          <Meter label="Weekly · all models" value={0.65} />
          <Meter label={`Context · ${Math.round((session?.contextUsed ?? 0) * 300)}k / 300k`} value={session?.contextUsed ?? 0} />
          <View className="flex-row gap-2 pt-1">
            <Text className="text-sm text-foreground">Compact</Text>
            <Text className="text-sm text-muted-foreground">·</Text>
            <Text className="text-sm text-foreground">Handoff</Text>
          </View>
        </View>
      </Overlay>
    </View>
  );
}

// Old Argo's tray above a new Session's composer: the main checkout's branch, or a new worktree "from" a picked branch.
function WorktreeRow({ draft, onDraft }: { draft: Draft; onDraft: (draft: Draft) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<Anchor>();
  const [ref, measure] = useAnchor<View>();
  const worktree = draft.checkout === 'worktree';
  const current = BRANCHES[0]!;
  const from = draft.from ?? current;
  const matches = BRANCHES.filter((branch) => branch.toLowerCase().includes(query.toLowerCase()));
  return (
    <View className="mx-3 -mb-3 rounded-t-xl border border-b-0 border-border bg-sidebar px-3 pt-1 pb-4">
      <View className="min-h-8 flex-row items-center gap-2">
        {worktree ? (
          <View ref={ref} className="flex-shrink">
            <Press
              onPress={async () => {
                setAnchor(await measure());
                setQuery('');
                setOpen(true);
              }}
              className="-ml-1.5 flex-row items-center gap-1.5 rounded-md px-1.5 py-1"
              hoverClassName="bg-muted"
            >
              <GitBranch size={14} color={colors.muted} />
              <Text className="flex-shrink text-sm font-medium text-foreground" numberOfLines={1}>
                {from}
              </Text>
              <ChevronDown size={14} color={colors.muted} />
            </Press>
          </View>
        ) : (
          <View className="flex-shrink flex-row items-center gap-1.5">
            <GitBranch size={14} color={colors.muted} />
            <Text className="flex-shrink text-sm text-muted-foreground" numberOfLines={1}>
              {current}
            </Text>
          </View>
        )}
        <View className="flex-1" />
        <Switch
          value={worktree}
          onValueChange={(on) => onDraft({ ...draft, checkout: on ? 'worktree' : 'main' })}
          trackColor={{ false: colors.border, true: colors.foreground }}
          thumbColor={colors.background}
          ios_backgroundColor={colors.border}
          {...({ activeThumbColor: colors.background } as object)}
          style={Platform.OS === 'web' ? undefined : { transform: [{ scale: 0.75 }] }}
        />
        <Press onPress={() => onDraft({ ...draft, checkout: worktree ? 'main' : 'worktree' })} hoverClassName="">
          <Text className="text-sm text-foreground">Worktree</Text>
        </Press>
      </View>
      <Overlay open={open} onClose={() => setOpen(false)} anchor={anchor} title="Start the new worktree from" width={320}>
        <View className="mx-1.5 mb-1 flex-row items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
          <Search size={14} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus={Platform.OS === 'web'}
            placeholder="Search branches"
            placeholderTextColor={colors.muted}
            className="flex-1 text-sm text-foreground"
            style={{ outlineStyle: 'none' } as object}
          />
        </View>
        {matches.length ? (
          matches.map((branch) => (
            <OptionRow
              key={branch}
              label={branch}
              icon={<GitBranch size={15} color={colors.muted} />}
              selected={branch === from}
              onPress={() => {
                onDraft({ ...draft, from: branch === current ? null : branch });
                setOpen(false);
              }}
            />
          ))
        ) : (
          <Text className="py-6 text-center text-sm text-muted-foreground">No branches found</Text>
        )}
      </Overlay>
    </View>
  );
}

function Meter({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="text-sm text-foreground">{label}</Text>
        <Text className="text-sm text-muted-foreground">{Math.round(value * 100)}%</Text>
      </View>
      <View className="h-1.5 rounded-full bg-muted">
        <View className="h-1.5 rounded-full bg-foreground" style={{ width: `${Math.round(value * 100)}%` }} />
      </View>
      {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
    </View>
  );
}

function Ring({ value }: { value: number }) {
  const colors = useColors();
  const circumference = 2 * Math.PI * 5;
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={5} stroke={colors.border} strokeWidth={2} fill="none" />
      <Circle
        cx={7}
        cy={7}
        r={5}
        stroke={value >= 0.4 ? colors.red : colors.green}
        strokeWidth={2}
        fill="none"
        strokeDasharray={`${circumference * value} ${circumference}`}
        transform="rotate(-90 7 7)"
      />
    </Svg>
  );
}

// U3: the request sits above the composer and replaces it until answered.
export function RequestCard({ session, request }: { session: Session; request: Request }) {
  const colors = useColors();
  const wide = useWide();
  const [denying, setDenying] = useState(false);
  const [message, setMessage] = useState('');
  const agent = catalogFor(session.agent).name;
  const button = 'flex-1 items-center rounded-xl py-2.5';
  return (
    <View className="gap-3 rounded-2xl border border-amber-500/40 bg-background p-4 shadow-sm shadow-black/10">
      {request.kind === 'permission' ? (
        <>
          <Text className="text-[15px] font-semibold text-foreground">{request.title}</Text>
          <View className="rounded-lg bg-muted p-2.5">
            <Text className="font-mono text-xs text-foreground" selectable>
              {request.detail}
            </Text>
          </View>
          {denying ? (
            <TextInput
              autoFocus
              value={message}
              onChangeText={setMessage}
              placeholder={`Tell ${agent} what to do instead (optional)`}
              placeholderTextColor={colors.muted}
              className={`rounded-lg border border-border px-3 text-foreground ${wide ? 'py-2 text-sm' : 'py-3 text-base'}`}
            />
          ) : null}
          <View className="flex-row gap-2">
            {denying ? (
              <>
                <Press onPress={() => setDenying(false)} className={`${button} bg-muted`}>
                  <Text className="text-sm font-medium text-foreground">Back</Text>
                </Press>
                <Press onPress={() => actions.answer(session.id, request, `Denied${message ? `: “${message}”` : ''}`)} className={`${button} bg-red-500`}>
                  <Text className="text-sm font-medium text-white">Deny</Text>
                </Press>
              </>
            ) : (
              <>
                <Press onPress={() => setDenying(true)} className={`${button} bg-muted`}>
                  <View className="flex-row items-center gap-1.5">
                    <X size={15} color={colors.foreground} />
                    <Text className="text-sm font-medium text-foreground">Deny…</Text>
                  </View>
                </Press>
                <Press onPress={() => actions.answer(session.id, request, `Allowed once: ${request.detail.slice(0, 48)}…`)} className={`${button} bg-primary`}>
                  <View className="flex-row items-center gap-1.5">
                    <Check size={15} color={colors.background} />
                    <Text className="text-sm font-medium text-primary-foreground">Allow once</Text>
                  </View>
                </Press>
              </>
            )}
          </View>
        </>
      ) : request.kind === 'elicitation' ? (
        <>
          <Text className="text-[15px] font-semibold text-foreground">{request.question}</Text>
          {request.options.map((option) => (
            <Press key={option} onPress={() => actions.answer(session.id, request, `You answered: ${option}`)} className="rounded-xl border border-border px-3 py-2.5" hoverClassName="bg-muted">
              <Text className="text-sm text-foreground">{option}</Text>
            </Press>
          ))}
          <TextInput
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={() => message && actions.answer(session.id, request, `You answered: ${message}`)}
            placeholder="Something else…"
            placeholderTextColor={colors.muted}
            className={`rounded-xl border border-border px-3 text-foreground ${wide ? 'py-2 text-sm' : 'py-3 text-base'}`}
          />
        </>
      ) : (
        <>
          <Text className="text-xs font-medium uppercase tracking-wide text-blue-500">Plan proposal</Text>
          <Text className="text-[15px] font-semibold text-foreground">{request.title}</Text>
          {request.steps.map((step, index) => (
            <Text key={step} className="text-sm leading-5 text-foreground">
              {index + 1}. {step}
            </Text>
          ))}
          <View className="flex-row gap-2">
            <Press onPress={() => actions.answer(session.id, request, 'You asked to keep planning')} className={`${button} bg-muted`}>
              <Text className="text-sm font-medium text-foreground">Keep planning</Text>
            </Press>
            <Press onPress={() => actions.answer(session.id, request, 'You approved the plan')} className={`${button} bg-primary`}>
              <Text className="text-sm font-medium text-primary-foreground">Approve</Text>
            </Press>
          </View>
        </>
      )}
    </View>
  );
}
