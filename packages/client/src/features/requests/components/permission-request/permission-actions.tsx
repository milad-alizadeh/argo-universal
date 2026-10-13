import type { PermissionOption } from '@repo/contracts';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { RequestAction } from '../request-card/request-card';
import type { PermissionChoices } from './permission-choices';
import {
  SplitButton,
  type SplitButtonChoice,
  type SplitButtonProps,
} from './split-button';

export interface PermissionActionsProps {
  choices: PermissionChoices;
  // The option each group's button sends; the chevron changes it.
  leads: Partial<Record<keyof PermissionChoices, PermissionOption>>;
  // The option Enter chooses; it gets the primary style.
  main: PermissionOption;
  disabled: boolean;
  label: (option: PermissionOption) => string;
  onChoose: (option: PermissionOption) => void;
  onPick: (option: PermissionOption) => void;
}

type GroupProps = PermissionActionsProps & { group: keyof PermissionChoices };

type LedGroupProps = Omit<PermissionActionsProps, 'choices' | 'leads'> & {
  options: PermissionOption[];
  lead: PermissionOption;
  menuLabel: string;
};

type OptionActionProps = Pick<
  PermissionActionsProps,
  'main' | 'disabled' | 'label' | 'onChoose'
> & { option: PermissionOption; className?: string };

const menuLabels = { allow: 'Allow options', reject: 'Reject options' };

// Desktop reads reject then allow in a row; phone stacks allow on top.
const layouts = {
  wide: { className: 'flex-row gap-1', groups: ['reject', 'allow'] },
  phone: { className: 'w-full gap-2', groups: ['allow', 'reject'] },
} as const;

const asChoice = ({
  optionId,
  name,
}: PermissionOption): SplitButtonChoice<string> => ({
  value: optionId,
  label: name,
});

// One control per group; a group with several options gets a chevron that picks which one it sends.
export function PermissionActions(props: PermissionActionsProps): ReactNode {
  const layout = useContentWide() ? layouts.wide : layouts.phone;

  return (
    <View className={layout.className}>
      {layout.groups.map((group) => (
        <OptionGroup key={group} {...props} group={group} />
      ))}
    </View>
  );
}

function OptionGroup({ group, ...props }: GroupProps): ReactNode {
  const lead = props.leads[group];

  if (!lead) return null;
  const options = props.choices[group];

  if (options.length === 1) return <OptionAction {...props} option={lead} />;
  const menuLabel = menuLabels[group];

  return <OptionSplitButton {...{ ...props, options, lead, menuLabel }} />;
}

function OptionSplitButton(group: LedGroupProps): ReactNode {
  const wide = useContentWide();

  return (
    <SplitButton {...splitChoices(group)}>
      <OptionAction
        {...group}
        option={group.lead}
        className={wide ? undefined : 'flex-1'}
      />
    </SplitButton>
  );
}

// The group in SplitButton's terms: option ids as values, the lead as the chosen one.
function splitChoices({
  options,
  lead,
  ...props
}: LedGroupProps): Omit<SplitButtonProps<string>, 'children'> {
  return {
    choices: options.map(asChoice),
    value: lead.optionId,
    onValueChange: (optionId) => pickById(options, optionId, props.onPick),
    menuLabel: props.menuLabel,
    primary: lead === props.main,
    disabled: props.disabled,
  };
}

function pickById(
  options: PermissionOption[],
  optionId: string,
  onPick: (option: PermissionOption) => void,
): void {
  const picked = options.find((option) => option.optionId === optionId);

  if (picked) onPick(picked);
}

function OptionAction({ option, ...props }: OptionActionProps): ReactNode {
  return (
    <RequestAction
      primary={option === props.main}
      disabled={props.disabled}
      className={props.className}
      onPress={() => props.onChoose(option)}
    >
      {props.label(option)}
    </RequestAction>
  );
}
