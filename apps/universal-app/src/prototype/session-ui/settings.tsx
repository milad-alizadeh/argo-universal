// PROTOTYPE: Settings. The same list is the desktop sidebar and the phone's root screen; a Project page edits its Integrations.
import { ChevronLeft, ChevronRight, CircleDot, Folder, FolderPlus, KeyRound } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LINEAR_TEAMS } from './fixtures';
import { AddProject, repositoryLabel, trackerLabel } from './projects';
import { ListHeader } from './sidebar';
import { actions, useStore } from './store';
import { go, OptionRow, Overlay, Press, useBase, useColors, useWide } from './ui';

type Service = 'GitHub' | 'GitLab' | 'Linear';
const ACCOUNT_USER: Record<Service, string> = { GitHub: 'milad-alizadeh', GitLab: 'milad', Linear: 'Argo' };

// `selected` is 'accounts' or a Project name.
export function SettingsNav({ style, selected }: { style: 'sidebar' | 'phone'; selected?: string }) {
  const base = useBase();
  const colors = useColors();
  const projects = useStore((s) => s.projects);
  const accounts = useStore((s) => s.accounts);
  const [adding, setAdding] = useState(false);
  const phone = style === 'phone';
  const connected = (Object.keys(accounts) as Service[]).filter((service) => accounts[service]);
  const size = phone ? 18 : 15;
  return (
    <ScrollView contentContainerClassName={phone ? 'px-4 pb-8' : 'px-2 pb-4'}>
      <Group title="Projects" phone={phone}>
        {projects.map((p) => (
          <Row key={p.name} phone={phone} selected={selected === p.name} icon={<Folder size={size} color={colors.muted} />} label={p.name} detail={trackerLabel(p)} onPress={() => go(`${base}/projects/${p.name}`)} />
        ))}
        <Row phone={phone} icon={<FolderPlus size={size} color={colors.blue} />} label="Add Project" tone={colors.blue} onPress={() => setAdding(true)} />
      </Group>
      <Group title="Server" phone={phone}>
        <Row phone={phone} selected={selected === 'accounts'} icon={<KeyRound size={size} color={colors.muted} />} label="Accounts" detail={connected.join(', ') || 'None'} onPress={() => go(`${base}/accounts`)} />
        <Row phone={phone} label="Connection" detail="this Mac" />
      </Group>
      <Group title="Agents" phone={phone}>
        <Row phone={phone} label="Claude" />
        <Row phone={phone} label="Codex" />
      </Group>
      <Group title="App" phone={phone}>
        <Row phone={phone} label="Appearance" />
        <Row phone={phone} label="Notifications" />
      </Group>
      <AddProject open={adding} onClose={() => setAdding(false)} onAdded={(name) => go(`${base}/projects/${name}`)} />
    </ScrollView>
  );
}

function Group({ title, phone, children }: { title: string; phone: boolean; children: ReactNode }) {
  return (
    <View className={phone ? 'mb-6' : 'mb-4'}>
      <Text className={`pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground ${phone ? '' : 'px-2.5'}`}>{title}</Text>
      <View className={phone ? 'overflow-hidden rounded-xl bg-muted' : ''}>{children}</View>
    </View>
  );
}

function Row({ phone, icon, label, detail, tone, selected, onPress }: { phone: boolean; icon?: ReactNode; label: string; detail?: string; tone?: string; selected?: boolean; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 ${phone ? 'px-4 py-3' : `rounded-lg px-2.5 py-2 ${selected ? 'bg-sidebar-accent' : ''}`}`}
      hoverClassName={phone ? '' : 'bg-sidebar-accent'}
    >
      {icon}
      <Text style={{ color: tone ?? colors.foreground }} className={`flex-1 ${phone ? 'text-base' : 'text-sm'}`} numberOfLines={1}>
        {label}
      </Text>
      {detail ? (
        <Text className={`text-muted-foreground ${phone ? 'text-sm' : 'text-xs'}`} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {phone && onPress ? <ChevronRight size={16} color={colors.muted} /> : null}
    </Press>
  );
}

export function SettingsScreen({ leading }: { leading?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ListHeader title="Settings" phone leading={leading} />
      <SettingsNav style="phone" />
    </View>
  );
}

// A pushed settings page on the phone; the main pane on desktop, where the sidebar stays.
function Page({ title, caption, onBack, children }: { title: string; caption?: string; onBack: () => void; children: ReactNode }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: wide ? 0 : insets.top }}>
      {wide ? null : (
        <View className="flex-row items-center px-2 py-1.5">
          <Press onPress={onBack} className="rounded-lg py-2 pr-1" hoverClassName="">
            <ChevronLeft size={24} color={colors.foreground} />
          </Press>
          <Text className="flex-1 text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
      <ScrollView contentContainerClassName={wide ? 'px-8 pt-8 pb-10' : 'px-4 pt-2 pb-10'} contentContainerStyle={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {wide ? <Text className="text-2xl font-semibold text-foreground">{title}</Text> : null}
        {caption ? <Text className={`text-sm text-muted-foreground ${wide ? 'mt-1' : ''}`}>{caption}</Text> : null}
        <View className="mt-6">{children}</View>
      </ScrollView>
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">{title}</Text>
      <View className="overflow-hidden rounded-xl border border-border px-1.5 py-1">{children}</View>
    </View>
  );
}

function Line({ label, detail, tone, onPress }: { label: string; detail?: string; tone?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Press onPress={onPress} disabled={!onPress} className="flex-row items-center gap-3 rounded-lg px-2.5 py-2.5" hoverClassName={onPress ? 'bg-muted' : ''}>
      <View className="flex-1">
        <Text style={{ color: tone ?? colors.foreground }} className="text-sm font-medium" numberOfLines={1}>
          {label}
        </Text>
        {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
      </View>
      {onPress ? <ChevronRight size={15} color={colors.muted} /> : null}
    </Press>
  );
}

export function ProjectSettings({ name, onBack }: { name: string; onBack: () => void }) {
  const base = useBase();
  const colors = useColors();
  const project = useStore((s) => s.projects.find((p) => p.name === name));
  const accounts = useStore((s) => s.accounts);
  const [teams, setTeams] = useState(false);
  if (!project) return <Text className="p-8 text-muted-foreground">No Project {name}</Text>;
  const host = project.repository?.host;
  const tracker = project.tracker;
  const toAccounts = () => go(`${base}/accounts`);
  return (
    <Page title={project.name} caption={`${trackerLabel(project)} · ${repositoryLabel(project)}`} onBack={onBack}>
      <Card title="Location">
        <Line label={project.path} detail="On the Server · this Mac. The folder is the Project, so it can't be edited." />
        <Line label="Relocate…" detail="Use when the folder has moved" onPress={() => {}} />
      </Card>
      <Card title="Repository">
        {project.repository ? (
          <>
            <Line label={repositoryLabel(project)} detail="Read from the git remote origin" />
            {host && accounts[host] ? (
              <Line label={`Signed in to ${host} as ${accounts[host]}`} detail="Pull requests and checks work" />
            ) : (
              <Line label={`Connect ${host}`} detail="Sign in once in Accounts" tone={colors.blue} onPress={toAccounts} />
            )}
          </>
        ) : (
          <Line label="No remote" detail="Add a remote with git; Argo reads it from the repository" />
        )}
      </Card>
      <Card title="Issues">
        <OptionRow label="None" selected={!tracker} onPress={() => actions.setTracker(name, null)} />
        {host === 'GitHub' ? (
          <OptionRow label="GitHub Issues" detail={project.repository?.slug} selected={tracker?.kind === 'github'} onPress={() => actions.setTracker(name, { kind: 'github' })} />
        ) : null}
        <OptionRow
          label="Linear"
          detail={tracker?.kind === 'linear' ? undefined : 'Pick a team'}
          selected={tracker?.kind === 'linear'}
          onPress={() => (tracker?.kind === 'linear' ? setTeams(true) : actions.setTracker(name, { kind: 'linear', team: LINEAR_TEAMS[0] }))}
        />
        {tracker?.kind === 'linear' ? <Line label={`Team · ${tracker.team}`} onPress={() => setTeams(true)} /> : null}
        {tracker && !accounts[tracker.kind === 'linear' ? 'Linear' : 'GitHub'] ? (
          <Line label={`Connect ${tracker.kind === 'linear' ? 'Linear' : 'GitHub'}`} detail="Sign in once in Accounts" tone={colors.blue} onPress={toAccounts} />
        ) : null}
      </Card>
      <Card title="Danger">
        <Line label="Remove Project" detail="Argo forgets the Project; the folder and its branches stay" tone={colors.red} onPress={() => {}} />
      </Card>
      <Overlay open={teams} onClose={() => setTeams(false)} title="Linear team">
        {LINEAR_TEAMS.map((team) => (
          <OptionRow key={team} label={team} icon={<CircleDot size={15} color={colors.muted} />} selected={tracker?.team === team} onPress={() => (actions.setTracker(name, { kind: 'linear', team }), setTeams(false))} />
        ))}
      </Overlay>
    </Page>
  );
}

export function AccountsScreen({ onBack }: { onBack: () => void }) {
  const accounts = useStore((s) => s.accounts);
  const colors = useColors();
  return (
    <Page title="Accounts" caption="Sign in once on the Server. Each Project then picks its repository and issue tracker." onBack={onBack}>
      <Card title="Services">
        {(Object.keys(accounts) as Service[]).map((service) => (
          <View key={service} className="flex-row items-center gap-3 px-2.5 py-2.5">
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">{service}</Text>
              <Text className="text-xs text-muted-foreground">{accounts[service] ? `Signed in as ${accounts[service]}` : 'Not connected'}</Text>
            </View>
            <Press
              onPress={() => actions.setAccount(service, accounts[service] ? null : ACCOUNT_USER[service])}
              className="rounded-md border border-border px-2.5 py-1"
              hoverClassName="bg-muted"
            >
              <Text style={{ color: accounts[service] ? colors.foreground : colors.blue }} className="text-sm">
                {accounts[service] ? 'Sign out' : 'Connect'}
              </Text>
            </Press>
          </View>
        ))}
      </Card>
    </Page>
  );
}
