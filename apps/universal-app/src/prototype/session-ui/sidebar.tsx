// PROTOTYPE: what every section's list shares, on the desktop sidebar and the phone's section screen alike.
import { Ellipsis, Folder, FolderOpen, ListFilter, Plus, Search, SquarePen, X } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddProject } from './projects';
import { type Anchor, go, OptionRow, Overlay, Press, useAnchor, useBase, useColors } from './ui';

// One row: the title, then search and filter as icons. Search opens in place of the title.
export function ListHeader({
  title,
  phone,
  leading,
  search,
  filter,
}: {
  title: string;
  phone: boolean;
  leading?: ReactNode;
  search?: { query: string; onQuery: (query: string) => void; placeholder: string };
  filter?: { active: boolean; content: (close: () => void) => ReactNode };
}) {
  const colors = useColors();
  const [searching, setSearching] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRef, measureFilter] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  const icon = phone ? 21 : 15;
  const button = phone ? 'rounded-lg p-1.5' : 'rounded-md p-1.5';
  const closeSearch = () => {
    search?.onQuery('');
    setSearching(false);
  };
  return (
    <View className={`flex-row items-center gap-1 ${phone ? 'px-4 pt-2 pb-3' : 'h-9 px-3 pb-2'}`}>
      {leading}
      {searching && search ? (
        <View className={`flex-1 flex-row items-center gap-2 rounded-lg ${phone ? 'bg-muted px-3 py-2' : 'bg-sidebar-accent px-2 py-1'}`}>
          <Search size={phone ? 17 : 14} color={colors.muted} />
          <TextInput
            value={search.query}
            onChangeText={search.onQuery}
            autoFocus
            placeholder={search.placeholder}
            placeholderTextColor={colors.muted}
            className={`flex-1 text-foreground ${phone ? 'text-base' : 'text-sm'}`}
            style={{ outlineStyle: 'none' } as object}
          />
          <Press onPress={closeSearch} className="rounded p-0.5" hoverClassName="bg-muted">
            <X size={phone ? 17 : 14} color={colors.muted} />
          </Press>
        </View>
      ) : (
        <>
          <Text className={`flex-1 text-foreground ${phone ? 'text-3xl font-bold' : 'px-2 text-sm font-semibold'}`} numberOfLines={1}>
            {title}
          </Text>
          {search ? (
            <Press onPress={() => setSearching(true)} className={button} hoverClassName="bg-sidebar-accent">
              <Search size={icon} color={phone ? colors.foreground : colors.muted} />
            </Press>
          ) : null}
        </>
      )}
      {filter ? (
        <View ref={filterRef}>
          <Press
            onPress={async () => {
              setAnchor(await measureFilter());
              setFilterOpen(true);
            }}
            className={button}
            hoverClassName="bg-sidebar-accent"
          >
            <ListFilter size={icon} color={filter.active ? colors.blue : phone ? colors.foreground : colors.muted} />
          </Press>
          <Overlay open={filterOpen} onClose={() => setFilterOpen(false)} anchor={anchor} title="Show" width={220}>
            {filter.content(() => setFilterOpen(false))}
          </Overlay>
        </View>
      ) : null}
    </View>
  );
}

// "Projects ⋯ +", then one heading per Project. A heading's ⋯ (hover on desktop, long-press on a phone) opens that Project's settings.
export function ProjectGroups({ phone, names, count, children }: { phone: boolean; names: string[]; count?: (name: string) => number | undefined; children: (name: string) => ReactNode }) {
  const base = useBase();
  const colors = useColors();
  const [closed, setClosed] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menuRef, measureMenu] = useAnchor<View>();
  const [addRef, measureAdd] = useAnchor<View>();
  const [anchor, setAnchor] = useState<Anchor>();
  const icon = phone ? 19 : 15;
  const button = phone ? 'rounded-md p-1.5' : 'rounded-md p-1';
  const edit = (name: string) => go(`${base}/projects/${name}`);
  const toggle = (name: string) => setClosed(closed.includes(name) ? closed.filter((n) => n !== name) : [...closed, name]);
  return (
    <View>
      <View className={`flex-row items-center gap-1 ${phone ? 'px-2.5 pt-1 pb-1' : 'px-2.5 pt-1 pb-0.5'}`}>
        <Text className={`flex-1 py-1 font-medium text-muted-foreground ${phone ? 'text-sm' : 'text-[13px]'}`}>Projects</Text>
        <View ref={menuRef}>
          <Press
            onPress={async () => {
              setAnchor(await measureMenu());
              setMenu(true);
            }}
            className={button}
            hoverClassName="bg-sidebar-accent"
          >
            <Ellipsis size={icon} color={colors.muted} />
          </Press>
        </View>
        <View ref={addRef}>
          <Press
            onPress={async () => {
              setAnchor(await measureAdd());
              setAdding(true);
            }}
            className={button}
            hoverClassName="bg-sidebar-accent"
          >
            <Plus size={icon + 1} color={colors.muted} />
          </Press>
        </View>
      </View>
      {names.map((name) => {
        const open = !closed.includes(name);
        const Icon = open ? FolderOpen : Folder;
        return (
          <View key={name} className="mb-2">
            <Press
              onPress={() => toggle(name)}
              onLongPress={() => edit(name)}
              className={`flex-row items-center gap-2.5 rounded-lg px-2.5 ${phone ? 'py-2' : 'py-1.5'}`}
              hoverClassName="bg-sidebar-accent"
            >
              {({ hovered }) => (
                <>
                  <Icon size={phone ? 18 : 16} color={colors.muted} />
                  <Text className={`flex-1 font-medium text-foreground ${phone ? 'text-base' : 'text-[15px]'}`} numberOfLines={1}>
                    {name}
                  </Text>
                  {!phone && hovered ? (
                    <Press onPress={() => edit(name)} className="rounded-md p-0.5" hoverClassName="bg-muted" accessibilityLabel={`Edit ${name}`}>
                      <Ellipsis size={15} color={colors.muted} />
                    </Press>
                  ) : (
                    <Text className="px-1 text-xs text-muted-foreground">{(open ? '' : count?.(name)) || ''}</Text>
                  )}
                </>
              )}
            </Press>
            {open ? children(name) : null}
          </View>
        );
      })}
      <Overlay open={menu} onClose={() => setMenu(false)} anchor={anchor} width={220}>
        <OptionRow label="Collapse all" onPress={() => (setClosed(names), setMenu(false))} />
        <OptionRow label="Expand all" onPress={() => (setClosed([]), setMenu(false))} />
      </Overlay>
      <AddProject open={adding} onClose={() => setAdding(false)} anchor={anchor} />
    </View>
  );
}

// The floating write button, bottom right on a phone and bottom left in the sidebar: new work starts here, and the new page asks for the Project and Server.
export function WriteButton({ phone, label, onPress }: { phone: boolean; label: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const size = phone ? 56 : 44;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      className="absolute items-center justify-center rounded-full border border-border bg-background shadow-lg shadow-black/15"
      style={{ ...(phone ? { right: 20 } : { left: 14 }), bottom: phone ? insets.bottom + 16 : 14, width: size, height: size }}
      hoverClassName="bg-muted"
    >
      <SquarePen size={phone ? 22 : 18} color={colors.foreground} />
    </Press>
  );
}

// A row inside a Project group, indented under its heading.
export function GroupRow({ phone, selected, label, detail, trailing, tone, onPress }: { phone: boolean; selected?: boolean; label: string; detail?: string; trailing?: ReactNode; tone?: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Press
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-lg pr-2.5 ${phone ? 'py-2.5 pl-10' : 'py-1.5 pl-9'} ${selected ? 'bg-sidebar-accent' : ''}`}
      hoverClassName="bg-sidebar-accent"
    >
      <Text style={{ color: tone ?? colors.foreground }} className={phone ? 'text-base' : 'text-sm'} numberOfLines={1}>
        {label}
      </Text>
      {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
      <View className="flex-1" />
      {trailing}
    </Press>
  );
}
