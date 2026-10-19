import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { Platform } from 'react-native';

export const pluginPlatform = (): PluginSurface['platform'] =>
  Platform.OS === 'ios' ? 'ios' : 'android';
