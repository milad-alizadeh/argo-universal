// PROTOTYPE: Atlas lists each Project's resources and shows one at a time. The resource names are placeholders.
import { ChevronLeft, ChevronRight, Workflow } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupRow, ListHeader, ProjectGroups } from './sidebar';
import { useStore } from './store';
import { go, Press, useBase, useColors, useWide } from './ui';

export const ATLAS_RESOURCES = [
  { id: 'overview', name: 'Overview' },
  { id: 'modules', name: 'Modules' },
  { id: 'flows', name: 'Flows' },
];

export function AtlasList({ style, selected, leading }: { style: 'sidebar' | 'phone'; selected?: { project?: string; id?: string }; leading?: ReactNode }) {
  const base = useBase();
  const colors = useColors();
  const projects = useStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const phone = style === 'phone';
  const shown = ATLAS_RESOURCES.filter((r) => !query || r.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <View className="flex-1">
      <ListHeader title="Atlas" phone={phone} leading={leading} search={{ query, onQuery: setQuery, placeholder: 'Search Atlas' }} />
      <ScrollView contentContainerClassName={phone ? 'px-2 pb-8' : 'px-2 pb-4'} keyboardShouldPersistTaps="handled">
        <ProjectGroups phone={phone} names={shown.length ? projects.map((p) => p.name) : []}>
          {(name) =>
            shown.map((resource) => (
              <GroupRow
                key={resource.id}
                phone={phone}
                selected={!phone && selected?.project === name && selected.id === resource.id}
                label={resource.name}
                trailing={phone ? <ChevronRight size={16} color={colors.muted} /> : null}
                onPress={() => go(`${base}/resource/${name}/${resource.id}`)}
              />
            ))
          }
        </ProjectGroups>
      </ScrollView>
    </View>
  );
}

export function AtlasResource({ project, id, onBack }: { project: string; id: string; onBack: () => void }) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const name = ATLAS_RESOURCES.find((r) => r.id === id)?.name ?? id;
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: wide ? 0 : insets.top }}>
      {wide ? null : (
        <View className="flex-row items-center px-2 py-1.5">
          <Press onPress={onBack} className="rounded-lg py-2 pr-1" hoverClassName="">
            <ChevronLeft size={24} color={colors.foreground} />
          </Press>
          <Text className="flex-1 text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {name}
          </Text>
        </View>
      )}
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Workflow size={28} color={colors.muted} />
        <Text className="text-lg font-semibold text-foreground">
          {project} · {name}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">A later section. Atlas shows one resource of one Project at a time.</Text>
      </View>
    </View>
  );
}
