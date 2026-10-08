import type { PermissionMode, ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type {
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
// The SDK names its modes only as a type, so this list and its names are ours; `dontAsk` is not offered.
const modeNames = {
  plan: 'Plan mode',
  default: 'Ask first',
  acceptEdits: 'Accept edits',
  auto: 'Auto',
  bypassPermissions: 'Bypass permissions',
} satisfies Partial<Record<PermissionMode, string>>;
export type Mode = keyof typeof modeNames;
const modeDescriptions = {
  default: 'Asks before edits and commands',
  acceptEdits: 'Edits files without asking, asks before commands',
  plan: 'Reads and plans, changes nothing',
  auto: 'Automatically checks permissions for each action',
  bypassPermissions: 'Runs everything without asking',
} satisfies Record<Mode, string>;
const modeMetadata = {
  default: { icon: 'ShieldWarning', tone: 'safe' },
  acceptEdits: { icon: 'Pencil', tone: 'moderate' },
  plan: { icon: 'MapTrifold', tone: 'planning' },
  auto: { icon: 'Sparkles', tone: 'moderate' },
  bypassPermissions: { icon: 'WarningTriangle', tone: 'dangerous' },
} satisfies Record<
  Mode,
  NonNullable<SessionConfigOption['_meta']>['argo'] & { icon: ConfigOptionIcon }
>;

export const modesFor = (model: ModelInfo | undefined): Mode[] =>
  Object.keys(modeNames)
    .filter((mode): mode is Mode => mode in modeNames)
    .filter((mode): boolean => allowsMode(mode, model));
function allowsMode(mode: Mode, model: ModelInfo | undefined): boolean {
  if (mode !== 'auto') return true;
  return model?.supportsAutoMode === true;
}
export function modeConfigOption(
  model: ModelInfo | undefined,
  mode: Mode,
): SessionConfigOption {
  return {
    type: 'select',
    configId: 'mode',
    name: 'Mode',
    category: 'mode',
    currentValue: mode,
    options: modesFor(model).map(modeChoice),
  };
}

function modeChoice(value: Mode): SessionConfigSelectOption {
  return {
    value,
    name: modeNames[value],
    description: modeDescriptions[value],
    _meta: { argo: modeMetadata[value] },
  };
}
