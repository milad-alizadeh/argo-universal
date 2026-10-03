// PROTOTYPE: the Feed, following docs/research/feed-presentation.md without the Turn fold.
import {
  Bot,
  Brain,
  ChevronRight,
  CircleAlert,
  FilePen,
  FileSearch,
  Globe,
  Layers,
  SquareTerminal,
  Wrench,
} from 'lucide-react-native';
import { createContext, Fragment, type ReactNode, useContext, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useOpenInspector } from './inspector';
import type { FeedRow, ToolCall } from './types';
import { Disclosure, duration, Press, useColors, useWide } from './ui';

type Unit =
  | { type: 'group'; id: string; items: FeedRow[] }
  | { type: 'row'; row: FeedRow };

const EXPLORE = (row: FeedRow) =>
  row.type === 'tool' && (row.kind === 'read' || row.kind === 'search' || row.kind === 'list' || (row.kind === 'execute' && row.readOnly));

// Rule 3: consecutive Tool calls merge; thoughts and request outcomes ride along, everything else closes the group.
function groupRows(rows: FeedRow[]): Unit[] {
  const units: Unit[] = [];
  let open: FeedRow[] | null = null;
  const close = () => {
    if (!open) return;
    const tools = open.filter((r) => r.type === 'tool');
    if (tools.length === 0) for (const r of open) units.push({ type: 'row', row: r });
    else units.push({ type: 'group', id: open[0]!.id, items: open });
    open = null;
  };
  for (const row of rows) {
    if (row.type === 'tool') {
      open = open ?? [];
      open.push(row);
    } else if ((row.type === 'thought' || row.type === 'request-outcome') && open) {
      open.push(row);
    } else if (row.type === 'thought') {
      open = [row];
    } else {
      close();
      units.push({ type: 'row', row });
    }
  }
  close();
  return units;
}

function liveLabel(tool: ToolCall) {
  if (tool.description) return tool.description;
  switch (tool.kind) {
    case 'read':
      return `Reading ${basename(tool.path)}`;
    case 'search':
      return `Searching for ${tool.query}`;
    case 'list':
      return `Listing ${tool.path}`;
    case 'execute':
      return `Running ${tool.command}`;
    case 'edit':
      return `Editing ${basename(tool.path)}`;
    case 'fetch':
      return `Searching the web for ${tool.query}`;
    default:
      return `Calling ${tool.server}`;
  }
}

function groupTitle(items: FeedRow[]) {
  const tools = items.filter((r): r is ToolCall => r.type === 'tool');
  const running = tools.find((t) => t.status === 'running');
  if (running) return { text: liveLabel(running), live: true };
  const parts: string[] = [];
  const edits = tools.filter((t) => t.kind === 'edit').length;
  const explore = tools.filter(EXPLORE).length;
  const commands = tools.filter((t) => t.kind === 'execute' && !t.readOnly).length;
  if (edits) parts.push(edits === 1 ? 'Edited a file' : `Edited ${edits} files`);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (explore) parts.push(`${parts.length ? 'explored' : 'Explored'} ${plural(explore, 'file')}`);
  if (commands) parts.push(`${parts.length ? 'ran' : 'Ran'} ${plural(commands, 'command')}`);
  const failed = tools.filter((t) => t.status === 'failed').length;
  return { text: (parts.join(', ') || 'Worked') + (failed ? ` · ${failed} failed` : ''), live: false };
}

function basename(path?: string) {
  return path?.split('/').pop() ?? '';
}

export function Feed({ rows, nested = false }: { rows: FeedRow[]; nested?: boolean }) {
  const units = groupRows(rows);
  return (
    <View className={nested ? 'gap-2' : 'gap-4'}>
      {units.map((unit) =>
        unit.type === 'group' ? (
          unit.items.filter((r) => r.type === 'tool').length === 1 && !unit.items.some((r) => r.type === 'tool' && r.status !== 'done') ? (
            <Fragment key={unit.id}>{renderGroupItems(unit.items)}</Fragment>
          ) : (
            <Group key={unit.id} items={unit.items} />
          )
        ) : (
          <Row key={unit.row.id} row={unit.row} />
        ),
      )}
    </View>
  );
}

function Group({ items }: { items: FeedRow[] }) {
  const title = groupTitle(items);
  const hasFailure = items.some((r) => r.type === 'tool' && r.status === 'failed');
  const [open, setOpen] = useState(title.live || hasFailure);
  const colors = useColors();
  return (
    <View className="gap-1.5">
      <Disclosure open={open} onToggle={() => setOpen(!open)} className="py-0.5">
        <Layers size={14} color={colors.muted} />
        <Text className={`flex-shrink text-sm ${title.live ? 'text-foreground' : 'text-muted-foreground'}`} numberOfLines={1}>
          {title.text}
        </Text>
      </Disclosure>
      {open ? <View className="ml-1.5 gap-1.5 border-border border-l pl-3">{renderGroupItems(items)}</View> : null}
    </View>
  );
}

// Rule 5: read, search, list and read-only commands fold into one exploration sub-row.
function renderGroupItems(items: FeedRow[]): ReactNode[] {
  const out: ReactNode[] = [];
  let explore: ToolCall[] = [];
  const flush = () => {
    if (explore.length) out.push(<Exploration key={`x${explore[0]!.id}`} tools={explore} />);
    explore = [];
  };
  for (const row of items) {
    if (EXPLORE(row)) explore.push(row as ToolCall);
    else if (row.type === 'thought' && explore.length) out.push(<Row key={row.id} row={row} />);
    else {
      flush();
      out.push(<Row key={row.id} row={row} />);
    }
  }
  flush();
  return out;
}

function Exploration({ tools }: { tools: ToolCall[] }) {
  const running = tools.some((t) => t.status === 'running');
  const [open, setOpen] = useState(running);
  const colors = useColors();
  const lines: string[] = [];
  for (const tool of tools) {
    const last = lines[lines.length - 1];
    if (tool.kind === 'read' && last?.startsWith('Read ')) lines[lines.length - 1] = `${last}, ${basename(tool.path)}`;
    else if (tool.kind === 'read') lines.push(`Read ${basename(tool.path)}`);
    else if (tool.kind === 'search') lines.push(`Searched for ${tool.query} in ${tool.path}`);
    else if (tool.kind === 'list') lines.push(`Listed files in ${tool.path}`);
    else lines.push(`Ran ${tool.command}`);
  }
  return (
    <View className="gap-1">
      <Disclosure open={open} onToggle={() => setOpen(!open)}>
        <FileSearch size={14} color={colors.muted} />
        <Text className={`text-sm ${running ? 'text-foreground' : 'text-muted-foreground'}`}>{running ? 'Exploring' : 'Explored'}</Text>
        <Text className="text-xs text-muted-foreground">{tools.length}</Text>
      </Disclosure>
      {open
        ? lines.map((line) => (
            <Text key={line} className="ml-5 font-mono text-xs text-muted-foreground" numberOfLines={1} ellipsizeMode="middle">
              {line}
            </Text>
          ))
        : null}
    </View>
  );
}

function Row({ row }: { row: FeedRow }) {
  const colors = useColors();
  const wide = useWide();
  switch (row.type) {
    case 'user':
      return (
        <View className={`self-end rounded-2xl bg-muted px-4 py-2.5 ${wide ? 'max-w-[80%]' : 'max-w-[88%]'}`}>
          <Text className="text-[15px] leading-6 text-foreground">{row.text}</Text>
          {row.images ? <Text className="mt-1 text-xs text-muted-foreground">{row.images} image{row.images > 1 ? 's' : ''}</Text> : null}
        </View>
      );
    case 'message':
      return <Markdown text={row.text} />;
    case 'thought':
      return <Thought title={row.title} text={row.text} seconds={row.seconds} />;
    case 'tool':
      return row.kind === 'execute' ? <Command tool={row} /> : row.kind === 'edit' ? <Edit tool={row} /> : <ToolLine tool={row} />;
    case 'subagent':
      return <Subagent row={row} />;
    case 'compaction':
      return <Divider text={`Context compacted${row.seconds ? ` · ${row.seconds}s` : ''}`} />;
    case 'turn-end':
      return <Divider text={row.stopped ? `You stopped after ${duration(row.seconds)}` : `Worked for ${duration(row.seconds)}`} />;
    case 'request-outcome':
      return <Text className="text-xs text-muted-foreground">{row.text}</Text>;
    case 'notice':
      return (
        <View className="flex-row items-start gap-2">
          <CircleAlert size={14} color={row.level === 'error' ? colors.red : colors.muted} style={{ marginTop: 2 }} />
          <Text style={{ color: row.level === 'error' ? colors.red : colors.muted }} className="flex-1 text-sm">
            {row.text}
          </Text>
        </View>
      );
  }
}

function Divider({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs text-muted-foreground">{text}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

function Thought({ title, text, seconds }: { title: string; text: string; seconds?: number }) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  return (
    <View className="gap-1">
      <Disclosure open={open} onToggle={() => setOpen(!open)}>
        <Brain size={14} color={colors.muted} />
        <Text className="flex-shrink text-sm text-muted-foreground" numberOfLines={1}>
          {seconds ? `Thought for ${seconds}s` : 'Thinking'} · {title}
        </Text>
      </Disclosure>
      {open ? (
        <ScrollView style={{ maxHeight: 140 }} className="ml-5">
          <Markdown text={text} small />
        </ScrollView>
      ) : null}
    </View>
  );
}

function ToolLine({ tool }: { tool: ToolCall }) {
  const colors = useColors();
  const Icon = tool.kind === 'fetch' ? Globe : tool.kind === 'other' ? Wrench : FileSearch;
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={14} color={colors.muted} />
      <Text className="flex-shrink text-sm text-muted-foreground" numberOfLines={1} ellipsizeMode="middle">
        {tool.status === 'running' ? liveLabel(tool) : tool.kind === 'read' ? `Read ${tool.path}` : tool.kind === 'search' ? `Searched for ${tool.query} in ${tool.path}` : `Listed files in ${tool.path}`}
      </Text>
    </View>
  );
}

// Rule 6: "Ran cmd" with the last 3 lines collapsed, the shell card expanded.
function Command({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const failed = tool.status === 'failed';
  const running = tool.status === 'running';
  const output = tool.output ?? [];
  const denied = tool.permission === 'denied';
  const label = denied ? `Denied ${tool.command}` : running ? (tool.permission === undefined && tool.description ? `Awaiting approval · ${tool.description}` : `Running ${tool.command}`) : `Ran ${tool.command}`;
  return (
    <View className="gap-1">
      <Disclosure open={open} onToggle={() => setOpen(!open)}>
        <SquareTerminal size={14} color={failed ? colors.red : colors.muted} />
        <Text style={{ color: failed ? colors.red : running && !denied ? colors.foreground : colors.muted }} className="flex-shrink font-mono text-[13px]" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {failed ? `exit ${tool.exitCode}` : tool.seconds ? `${tool.seconds}s` : ''}
        </Text>
      </Disclosure>
      {open ? (
        <View className="rounded-lg border border-border bg-muted/40 p-2.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <Text className="font-mono text-xs text-foreground">$ {tool.command}</Text>
              {output.map((line, index) => (
                <Text key={`${index}${line}`} className="font-mono text-xs text-muted-foreground">
                  {line || ' '}
                </Text>
              ))}
              <Text style={{ color: failed ? colors.red : colors.green }} className="mt-1 font-mono text-xs">
                {running ? '…' : failed ? `✗ ${tool.exitCode}` : '✓ Success'}
              </Text>
            </View>
          </ScrollView>
        </View>
      ) : output.length && !running ? (
        <View className="ml-5">
          {output.slice(-3).map((line, index) => (
            <Text key={`${index}${line}`} className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
              {line || ' '}
            </Text>
          ))}
          {output.length > 3 ? <Text className="font-mono text-xs text-muted-foreground">… +{output.length - 3} lines</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// Rule 7: "Edited path +a −r"; expanding shows the diff.
// On desktop the diff opens in the right inspector instead.
function Edit({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const openInspector = useOpenInspector();
  const toggle = () =>
    openInspector && tool.diff ? openInspector({ kind: 'edit', path: tool.path ?? '', lines: tool.diff.lines, added: tool.diff.added, removed: tool.diff.removed }) : setOpen(!open);
  return (
    <View className="gap-1">
      <Disclosure open={open} onToggle={toggle}>
        <FilePen size={14} color={colors.muted} />
        <Text className="flex-shrink text-sm text-muted-foreground" numberOfLines={1} ellipsizeMode="middle">
          {tool.status === 'running' ? 'Editing' : tool.diff?.created ? 'Added' : 'Edited'} {tool.path}
        </Text>
        <Text style={{ color: colors.green }} className="text-xs">
          +{tool.diff?.added}
        </Text>
        <Text style={{ color: colors.red }} className="text-xs">
          −{tool.diff?.removed}
        </Text>
      </Disclosure>
      {open && tool.diff ? <Diff lines={tool.diff.lines} /> : null}
    </View>
  );
}

export function Diff({ lines }: { lines: string[] }) {
  const colors = useColors();
  return (
    <View className="overflow-hidden rounded-lg border border-border">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="py-1.5">
          {lines.map((line, index) => (
            <Text
              key={`${index}${line}`}
              className="px-2.5 font-mono text-xs"
              style={{
                color: line.startsWith('@@') ? colors.blue : colors.foreground,
                backgroundColor: line.startsWith('+') ? 'rgba(34,197,94,0.12)' : line.startsWith('-') ? 'rgba(239,68,68,0.12)' : undefined,
              }}
            >
              {line || ' '}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Opens a Subagent's own Feed: the right inspector on desktop, a sheet on a phone.
export const OpenWorkContext = createContext<((id: string) => void) | null>(null);

function Subagent({ row }: { row: Extract<FeedRow, { type: 'subagent' }> }) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const openWork = useContext(OpenWorkContext);
  if (openWork) {
    return (
      <Press onPress={() => openWork(row.id)} className="gap-1 rounded-lg border border-border px-3 py-2" hoverClassName="bg-muted/50">
        <View className="flex-row items-center gap-1.5">
          <Bot size={14} color={colors.muted} />
          <Text className="flex-1 text-sm text-foreground">
            {row.name} {row.state === 'running' ? 'started working' : 'finished'}
          </Text>
          <Text className="text-xs text-muted-foreground">Open</Text>
          <ChevronRight size={14} color={colors.muted} />
        </View>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {row.prompt}
        </Text>
      </Press>
    );
  }
  return (
    <View className="gap-2 rounded-lg border border-border px-3 py-2">
      <Disclosure open={open} onToggle={() => setOpen(!open)}>
        <Bot size={14} color={colors.muted} />
        <Text className="text-sm text-foreground">
          {row.name} {row.state === 'running' ? 'started working' : 'finished'}
        </Text>
      </Disclosure>
      <Text className="text-xs text-muted-foreground" numberOfLines={open ? undefined : 1}>
        {row.prompt}
      </Text>
      {open ? <Feed rows={row.rows} nested /> : null}
    </View>
  );
}

// Enough markdown for the fixtures: paragraphs, "- " bullets, `code` and **bold**.
export function Markdown({ text, small = false }: { text: string; small?: boolean }) {
  const size = small ? 'text-sm leading-5 text-muted-foreground' : 'text-[15px] leading-6 text-foreground';
  return (
    <View className="gap-2">
      {text.split('\n\n').map((block) => (
        <View key={block} className="gap-1">
          {block.split('\n').map((line) =>
            line.startsWith('- ') ? (
              <View key={line} className="flex-row gap-2 pl-1">
                <Text className={size}>•</Text>
                <Text className={`flex-1 ${size}`}>{inline(line.slice(2))}</Text>
              </View>
            ) : (
              <Text key={line} className={size}>
                {inline(line)}
              </Text>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith('`') ? (
      <Text key={`${index}${part}`} className="rounded bg-muted font-mono text-[13px]">
        {part.slice(1, -1)}
      </Text>
    ) : part.startsWith('**') ? (
      <Text key={`${index}${part}`} className="font-semibold">
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );
}

export function LiveHeader({ activity, startedAt, now, compact }: { activity: string; startedAt?: number; now: number; compact: boolean }) {
  const colors = useColors();
  const seconds = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />
      <Text className="flex-shrink text-sm text-foreground" numberOfLines={1}>
        {activity}
      </Text>
      <Text className="text-sm text-muted-foreground">
        ({duration(seconds)}
        {compact ? ')' : ' • Esc to stop)'}
      </Text>
    </View>
  );
}

export { Press };
