// PROTOTYPE: shared bits for the universal Session UI prototype.
import { type Href, router } from 'expo-router';
import {
  Aperture,
  Asterisk,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FilePen,
  Hand,
  Map as MapIcon,
  ShieldCheck,
  ShieldOff,
  Sparkles,
} from 'lucide-react-native';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  type PressableProps,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';
import type { AgentId, Session, Tone } from './types';

// Width decides the layout, not the platform, so an iPad or a wide browser gets the desktop shell.
export const WIDE = 720;
export function useWide() {
  return useWindowDimensions().width >= WIDE;
}

export function useColors() {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  return {
    foreground: dark ? '#fafafa' : '#171717',
    muted: dark ? '#a3a3a3' : '#737373',
    border: dark ? '#333' : '#e5e5e5',
    background: dark ? '#0a0a0a' : '#ffffff',
    claude: '#d97757',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
  };
}

// Every prototype route sits under one base path.
export function useBase() {
  return '/prototype';
}

export function go(href: string, replace = false) {
  if (replace) router.replace(href as Href);
  else router.push(href as Href);
}

export const TONE_COLOR: Record<Tone, string> = {
  planning: '#3b82f6',
  safe: '#737373',
  moderate: '#737373',
  dangerous: '#ef4444',
};

export function ModeIcon({ icon, color, size = 15 }: { icon: string; color: string; size?: number }) {
  const Icon =
    { hand: Hand, 'file-pen': FilePen, map: MapIcon, sparkles: Sparkles, 'shield-off': ShieldOff, 'shield-check': ShieldCheck }[icon] ??
    Bot;
  return <Icon size={size} color={color} />;
}

export function AgentLogo({ agent, size = 16, spin = false }: { agent: AgentId; size?: number; spin?: boolean }) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spin) return;
    const loop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      {agent === 'claude' ? <Asterisk size={size + 2} color={colors.claude} strokeWidth={2.75} /> : <Aperture size={size} color={colors.foreground} strokeWidth={2} />}
    </Animated.View>
  );
}

export function useBlink(on: boolean) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, opacity]);
  return opacity;
}

export function stateColor(session: Session, colors: ReturnType<typeof useColors>) {
  if (session.state === 'running') return colors.green;
  if (session.state === 'needs_input') return colors.amber;
  if (session.state === 'failed') return colors.red;
  if (session.unread) return colors.blue;
  return colors.muted;
}

export function StatusMark({ session, size = 16 }: { session: Session; size?: number }) {
  const colors = useColors();
  const opacity = useBlink(session.state === 'running' || session.state === 'needs_input');
  return (
    <View style={{ width: size + 4, height: size + 4 }}>
      <AgentLogo agent={session.agent} size={size} spin={session.state === 'running'} />
      <Animated.View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 7,
          height: 7,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: colors.background,
          backgroundColor: stateColor(session, colors),
          opacity,
        }}
      />
    </View>
  );
}

export function stateLabel(session: Session) {
  if (session.archived) return 'Archived';
  return { needs_input: 'Needs input', running: 'Running', failed: 'Failed', idle: session.unread ? 'Unread' : 'Idle' }[session.state];
}

type HoverState = { hovered?: boolean; pressed: boolean };

// Pressable with a hover tint on web and a press tint on touch; classes sit on the Pressable so layout classes work.
export function Press({
  className,
  children,
  hoverClassName = 'bg-sidebar-accent',
  ...props
}: Omit<PressableProps, 'children'> & { className?: string; hoverClassName?: string; children: ReactNode | ((s: HoverState) => ReactNode) }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...props}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={`${className ?? ''} ${hovered || pressed ? hoverClassName : ''}`}
    >
      {typeof children === 'function' ? children({ hovered, pressed }) : children}
    </Pressable>
  );
}

export function Chip({ label, onPress, icon, tone }: { label: string; onPress?: () => void; icon?: ReactNode; tone?: string }) {
  const colors = useColors();
  return (
    <Press onPress={onPress} className="flex-row items-center gap-1.5 rounded-md px-2 py-1.5" hoverClassName="bg-muted">
      {icon}
      <Text style={{ color: tone ?? colors.foreground }} className="text-sm font-medium">
        {label}
      </Text>
      <ChevronDown size={13} color={colors.muted} />
    </Press>
  );
}

export interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useAnchor<T extends View>(): [RefObject<T | null>, () => Promise<Anchor>] {
  const ref = useRef<T>(null);
  // Native flattens plain Views and never calls back, so fall back after a frame; phones ignore the anchor anyway.
  const measure = () =>
    new Promise<Anchor>((resolve) => {
      const fallback = setTimeout(() => resolve({ x: 0, y: 0, width: 0, height: 0 }), 32);
      ref.current?.measureInWindow((x, y, width, height) => {
        clearTimeout(fallback);
        resolve({ x, y, width, height });
      });
    });
  return [ref, measure];
}

// One primitive for pickers and menus: a bottom sheet when narrow, a popover at the trigger when wide or when asked.
export function Overlay({
  open,
  onClose,
  anchor,
  title,
  children,
  width = 300,
  popover = false,
}: {
  open: boolean;
  onClose: () => void;
  anchor?: Anchor;
  title?: string;
  children: ReactNode;
  width?: number;
  popover?: boolean;
}) {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  if (!open) return null;
  if (wide || popover) {
    const left = anchor ? Math.max(12, Math.min(anchor.x, window.width - width - 12)) : (window.width - width) / 2;
    const fromBottom = anchor ? window.height - anchor.y + 6 : undefined;
    const openUp = anchor ? anchor.y > window.height / 2 : false;
    return (
      <Modal transparent visible onRequestClose={onClose} animationType="none">
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            className="absolute rounded-xl border border-border bg-popover p-1.5 shadow-lg shadow-black/15"
            style={{
              left,
              width,
              ...(anchor ? (openUp ? { bottom: fromBottom } : { top: anchor.y + anchor.height + 6 }) : { top: window.height * 0.2 }),
            }}
          >
            {title ? <Text className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{title}</Text> : null}
            {children}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
  return (
    <Modal transparent visible onRequestClose={onClose} animationType="slide">
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={onClose}>
        <Pressable onPress={() => {}} className="rounded-t-2xl bg-background px-2 pt-2" style={{ paddingBottom: insets.bottom + 8, maxHeight: window.height * 0.85 }}>
          <View className="mb-2 h-1 w-9 self-center rounded-full bg-border" />
          {title ? <Text className="px-3 pb-2 text-base font-semibold text-foreground">{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function OptionRow({
  label,
  detail,
  selected,
  icon,
  tone,
  onPress,
}: {
  label: string;
  detail?: string;
  selected?: boolean;
  icon?: ReactNode;
  tone?: string;
  onPress: () => void;
}) {
  const wide = useWide();
  const colors = useColors();
  return (
    <Press onPress={onPress} className={`flex-row items-center gap-3 rounded-lg px-2.5 ${wide ? 'py-2' : 'py-3'}`} hoverClassName="bg-muted">
      {icon}
      <View className="flex-1">
        <Text style={{ color: tone ?? colors.foreground }} className={`${wide ? 'text-sm' : 'text-base'} font-medium`}>
          {label}
        </Text>
        {detail ? <Text className="text-xs text-muted-foreground">{detail}</Text> : null}
      </View>
      {selected ? <Check size={16} color={colors.foreground} /> : null}
    </Press>
  );
}

export function Disclosure({
  open,
  onToggle,
  children,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  const colors = useColors();
  return (
    <Press onPress={onToggle} className={`flex-row items-center gap-1.5 rounded-md ${className ?? ''}`} hoverClassName="">
      {children}
      <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
        <ChevronRight size={14} color={colors.muted} />
      </View>
    </Press>
  );
}

export function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
