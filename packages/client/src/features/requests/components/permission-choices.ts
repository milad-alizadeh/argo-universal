import type { PermissionOption, PermissionOptionKind } from '@repo/contracts';

// The Agent's options, split into allow and reject groups; each group leads with its "once" option.
export interface PermissionChoices {
  allow: PermissionOption[];
  reject: PermissionOption[];
}

const leadWith = (
  options: PermissionOption[],
  kind: PermissionOptionKind,
): PermissionOption[] => {
  const lead = options.find((option) => option.kind === kind);
  return lead
    ? [lead, ...options.filter((option) => option !== lead)]
    : options;
};

const isAllow = ({ kind }: PermissionOption): boolean =>
  kind === 'allow_once' || kind === 'allow_always';

export const permissionChoices = (
  options: PermissionOption[],
): PermissionChoices => ({
  allow: leadWith(options.filter(isAllow), 'allow_once'),
  reject: leadWith(
    options.filter((option) => !isAllow(option)),
    'reject_once',
  ),
});
