// PROTOTYPE: the phone drawer holds the sections; each section opens on its list, the desktop sidebar drawn full screen.
import { Slot, usePathname } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { CircleDot, MessagesSquare, Settings, Workflow } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sectionOf } from '@/prototype/session-ui/shell';
import { useStore } from '@/prototype/session-ui/store';
import { go, Press, useColors, useWide } from '@/prototype/session-ui/ui';

export default function DrawerLayout() {
  if (useWide()) return <Slot />;
  return (
    <Drawer
      screenOptions={{ headerShown: false, drawerType: 'front', swipeEdgeWidth: 60, drawerStyle: { width: 280 } }}
      drawerContent={(props) => <Sections close={() => props.navigation.closeDrawer()} />}
    >
      <Drawer.Screen name="index" />
      <Drawer.Screen name="issues" />
      <Drawer.Screen name="atlas" />
      <Drawer.Screen name="settings" />
    </Drawer>
  );
}

function Sections({ close }: { close: () => void }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const section = sectionOf(usePathname());
  const waiting = useStore((s) => s.sessions.filter((x) => !x.archived && x.state === 'needs_input').length);
  const items = [
    { key: 'sessions', label: 'Sessions', Icon: MessagesSquare, href: '/prototype', badge: waiting },
    { key: 'issues', label: 'Issues', Icon: CircleDot, href: '/prototype/issues', badge: 0 },
    { key: 'atlas', label: 'Atlas', Icon: Workflow, href: '/prototype/atlas', badge: 0 },
    { key: 'settings', label: 'Settings', Icon: Settings, href: '/prototype/settings', badge: 0 },
  ];
  return (
    <View className="flex-1 bg-sidebar px-3" style={{ paddingTop: insets.top + 12 }}>
      <Text className="px-3 pb-4 text-xl font-bold text-foreground">argo</Text>
      {items.map(({ key, label, Icon, href, badge }) => (
        <Press
          key={key}
          onPress={() => {
            go(href, true);
            close();
          }}
          className={`flex-row items-center gap-3 rounded-lg px-3 py-3 ${section === key ? 'bg-sidebar-accent' : ''}`}
          hoverClassName="bg-sidebar-accent"
        >
          <Icon size={20} color={section === key ? colors.foreground : colors.muted} />
          <Text className={`flex-1 text-base text-foreground ${section === key ? 'font-semibold' : ''}`}>{label}</Text>
          {badge ? (
            <View className="min-w-5 items-center rounded-full bg-red-500 px-1.5 py-0.5">
              <Text className="text-xs font-semibold text-white">{badge}</Text>
            </View>
          ) : null}
        </Press>
      ))}
    </View>
  );
}
