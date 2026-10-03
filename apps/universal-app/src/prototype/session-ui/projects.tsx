// PROTOTYPE: Add Project and the Project picker, plus labels for a Project's Integrations.
import { ChevronsUpDown, Folder, FolderGit2, FolderPlus, Laptop, Plus, Search } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { FOLDERS } from './fixtures';
import { actions, useStore } from './store';
import type { Project } from './types';
import { type Anchor, OptionRow, Overlay, Press, useAnchor, useColors, useWide } from './ui';

export function trackerLabel(project: Project) {
  if (project.tracker?.kind === 'linear') return `Linear · ${project.tracker.team}`;
  if (project.tracker?.kind === 'github') return 'GitHub Issues';
  return 'No issue tracker';
}

export function repositoryLabel(project: Project) {
  return project.repository ? `${project.repository.host} · ${project.repository.slug}` : 'No remote';
}

// Add Project lists folders on the Server, not on the device showing the App.
export function AddProject({ open, onClose, anchor, onAdded }: { open: boolean; onClose: () => void; anchor?: Anchor; onAdded?: (name: string) => void }) {
  const colors = useColors();
  const wide = useWide();
  const projects = useStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const folders = FOLDERS.filter((f) => !query || f.path.toLowerCase().includes(query.toLowerCase()));
  const size = wide ? 15 : 18;
  return (
    <Overlay open={open} onClose={onClose} anchor={anchor} title="Add a Project from this Mac" width={340}>
      <View className={`mx-1 mb-1 flex-row items-center gap-2 rounded-lg bg-muted px-2.5 ${wide ? 'py-1.5' : 'py-2.5'}`}>
        <Search size={size - 1} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus={Platform.OS === 'web'}
          placeholder="Search ~/Developer"
          placeholderTextColor={colors.muted}
          className={`flex-1 text-foreground ${wide ? 'text-sm' : 'text-base'}`}
          style={{ outlineStyle: 'none' } as object}
        />
      </View>
      {folders.map((folder) => {
        const added = projects.some((p) => p.path === folder.path);
        const detail = added ? 'Already added' : !folder.git ? 'Not a git repository' : folder.repository ? `${folder.path} · ${folder.repository.host}` : `${folder.path} · no remote`;
        const icon = folder.git ? <FolderGit2 size={size} color={colors.foreground} /> : <Folder size={size} color={colors.muted} />;
        if (added || !folder.git) {
          return (
            <View key={folder.path} className="opacity-50">
              <OptionRow label={folder.name} detail={detail} icon={icon} onPress={() => {}} />
            </View>
          );
        }
        return (
          <OptionRow
            key={folder.path}
            label={folder.name}
            detail={detail}
            icon={icon}
            onPress={() => {
              actions.addProject({ name: folder.name, path: folder.path, repository: folder.repository, tracker: null });
              onClose();
              setQuery('');
              onAdded?.(folder.name);
            }}
          />
        );
      })}
      {folders.length === 0 ? <Text className="px-2.5 py-3 text-sm text-muted-foreground">No folders found</Text> : null}
    </Overlay>
  );
}

// Pick one Project, with Add Project at the end.
export function ProjectPicker({
  open,
  onClose,
  anchor,
  title,
  selected,
  onPick,
  only,
}: {
  open: boolean;
  onClose: () => void;
  anchor?: Anchor;
  title: string;
  selected: string;
  onPick: (name: string) => void;
  only?: (project: Project) => boolean;
}) {
  const colors = useColors();
  const wide = useWide();
  const projects = useStore((s) => s.projects).filter((p) => !only || only(p));
  const [adding, setAdding] = useState(false);
  const size = wide ? 15 : 18;
  return (
    <>
      <Overlay open={open} onClose={onClose} anchor={anchor} title={title} width={280}>
        {projects.map((p) => (
          <OptionRow key={p.name} label={p.name} icon={<Folder size={size} color={colors.muted} />} selected={p.name === selected} onPress={() => (onPick(p.name), onClose())} />
        ))}
        <View className="my-1 h-px bg-border" />
        <OptionRow label="Add Project…" icon={<FolderPlus size={size} color={colors.blue} />} tone={colors.blue} onPress={() => (onClose(), setTimeout(() => setAdding(true), Platform.OS === 'web' ? 0 : 400))} />
      </Overlay>
      <AddProject open={adding} onClose={() => setAdding(false)} anchor={anchor} onAdded={onPick} />
    </>
  );
}

// One Server for now; the picker is here so a second machine has a place to go later.
const SERVERS = ["Milad's Mac mini"];

// Where new work goes, as in Codex: a Server row and a Project row above the composer.
export function TargetRows({ project, onProject, only, title }: { project: string; onProject: (name: string) => void; only?: (project: Project) => boolean; title: string }) {
  const colors = useColors();
  const wide = useWide();
  const [picking, setPicking] = useState<'server' | 'project' | null>(null);
  const [serverRef, measureServer] = useAnchor<View>();
  const [projectRef, measureProject] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  const size = wide ? 16 : 20;
  const Row = ({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) => (
    <Press onPress={onPress} className={`flex-row items-center gap-3 self-start rounded-lg px-2 ${wide ? 'py-1.5' : 'py-2'}`} hoverClassName="bg-muted">
      {icon}
      <Text className={`text-muted-foreground ${wide ? 'text-sm' : 'text-lg'}`}>{label}</Text>
      <ChevronsUpDown size={wide ? 14 : 16} color={colors.muted} />
    </Press>
  );
  return (
    <View className="gap-1 px-2 pb-2">
      <View ref={serverRef} className="self-start">
        <Row icon={<Laptop size={size} color={colors.muted} />} label={SERVERS[0]!} onPress={async () => (setAnchor(await measureServer()), setPicking('server'))} />
      </View>
      <View ref={projectRef} className="self-start">
        <Row icon={<Folder size={size} color={colors.muted} />} label={project} onPress={async () => (setAnchor(await measureProject()), setPicking('project'))} />
      </View>
      <Overlay open={picking === 'server'} onClose={() => setPicking(null)} anchor={anchor} title="Server" width={280}>
        {SERVERS.map((name) => (
          <OptionRow key={name} label={name} detail="This Mac" icon={<Laptop size={size - 1} color={colors.muted} />} selected onPress={() => setPicking(null)} />
        ))}
        <View className="opacity-50">
          <OptionRow label="Add a Server…" detail="Later: Sessions on another machine" icon={<Plus size={size - 1} color={colors.muted} />} onPress={() => {}} />
        </View>
      </Overlay>
      <ProjectPicker open={picking === 'project'} onClose={() => setPicking(null)} anchor={anchor} title={title} selected={project} onPick={onProject} only={only} />
    </View>
  );
}
