import type {
  ConfigOptionIcon,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { choiceMetadata } from './configuration-values';

const optionIcons = {
  ShieldWarning: 'permission',
  Pencil: 'edit',
  MapTrifold: 'plan-mode',
  Sparkles: 'sparkle',
  WarningTriangle: 'warning',
} satisfies Record<ConfigOptionIcon, IconName>;

// ACP Agents send their modes without Argo's icon, so the well-known mode values name theirs.
const modeValueIcons = {
  default: 'permission',
  acceptEdits: 'edit',
  plan: 'plan-mode',
  auto: 'sparkle',
  bypassPermissions: 'warning',
} satisfies Record<string, IconName>;

const modeIcons = new Map<string, IconName>([
  ...Object.entries(modeValueIcons).map(([value, icon]): [string, IconName] => [
    `value:${value}`,
    icon,
  ]),
  ...Object.entries(optionIcons).map(([name, icon]): [string, IconName] => [
    `icon:${name}`,
    icon,
  ]),
]);

// A mode's icon: the Agent's own, else its value's, else the permission shield.
export function modeIcon(choice?: SessionConfigSelectOption): IconName {
  return (
    iconKeys(choice)
      .map((key) => modeIcons.get(key))
      .find(Boolean) ?? 'permission'
  );
}

function iconKeys(choice?: SessionConfigSelectOption): string[] {
  if (!choice) return [];

  return [`icon:${choiceMetadata(choice)?.icon}`, `value:${choice.value}`];
}
