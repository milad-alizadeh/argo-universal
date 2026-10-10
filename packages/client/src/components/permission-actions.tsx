import type { PermissionOption } from '@repo/contracts';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { useContentWide } from './content-layout';
import type { PermissionChoices } from './permission-choices';
import { RequestAction } from './request-card';
import { SplitButton } from './split-button';

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

type GroupProps = Omit<PermissionActionsProps, 'choices' | 'leads'> & {
  options: PermissionOption[];
  lead: PermissionOption | undefined;
  menuLabel: string;
  className?: string;
};

const rejectMenuLabel = 'Reject options';
const allowMenuLabel = 'Allow options';

// One control per group; a group with several options gets a chevron that picks which one it sends.
export function PermissionActions(props: PermissionActionsProps): ReactNode {
  return useContentWide() ? (
    <WideActions {...props} />
  ) : (
    <PhoneActions {...props} />
  );
}

function WideActions({
  choices,
  leads,
  ...props
}: PermissionActionsProps): ReactNode {
  return (
    <View className="flex-row gap-1">
      <OptionGroup
        {...props}
        options={choices.reject}
        lead={leads.reject}
        menuLabel={rejectMenuLabel}
      />
      <OptionGroup
        {...props}
        options={choices.allow}
        lead={leads.allow}
        menuLabel={allowMenuLabel}
      />
    </View>
  );
}

// Two options share a row; otherwise each group takes a full-width row, allow on top.
function PhoneActions({
  choices,
  leads,
  ...props
}: PermissionActionsProps): ReactNode {
  const { allow, reject } = choices;
  if (allow.length + reject.length > 2)
    return (
      <View className="flex-1 gap-2">
        <OptionGroup
          {...props}
          options={allow}
          lead={leads.allow}
          menuLabel={allowMenuLabel}
        />
        <OptionGroup
          {...props}
          options={reject}
          lead={leads.reject}
          menuLabel={rejectMenuLabel}
        />
      </View>
    );
  return (
    <View className="flex-1 flex-row gap-1">
      {[...reject, ...allow].map((option) => (
        <OptionAction
          {...props}
          key={option.optionId}
          option={option}
          className={cn('flex-1', option !== props.main && 'bg-secondary')}
        />
      ))}
    </View>
  );
}

function OptionGroup({ options, lead, ...props }: GroupProps): ReactNode {
  const wide = useContentWide();
  if (!lead) return null;
  if (options.length === 1) return <OptionAction {...props} option={lead} />;
  return (
    <SplitButton
      choices={options.map(({ optionId, name }) => ({
        value: optionId,
        label: name,
      }))}
      value={lead.optionId}
      onValueChange={(optionId) => {
        const picked = options.find((option) => option.optionId === optionId);
        if (picked) props.onPick(picked);
      }}
      menuLabel={props.menuLabel}
      primary={lead === props.main}
      disabled={props.disabled}
    >
      <OptionAction
        {...props}
        option={lead}
        className={wide ? undefined : 'flex-1'}
      />
    </SplitButton>
  );
}

function OptionAction({
  option,
  main,
  disabled,
  label,
  onChoose,
  className,
}: Omit<GroupProps, 'options' | 'lead' | 'menuLabel' | 'onPick'> & {
  option: PermissionOption;
}): ReactNode {
  return (
    <RequestAction
      primary={option === main}
      disabled={disabled}
      className={className}
      onPress={() => onChoose(option)}
    >
      {label(option)}
    </RequestAction>
  );
}
