import type { ReactNode } from 'react';
import { View } from 'react-native';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import {
  type SheetNavigation,
  useOptionalSheet,
} from '#primitives/overlays/sheet';
import { Pressable } from '#primitives/pressable';
import type { PlanView } from './use-plan-view';

interface PlanHeaderProps {
  title: string;
  // The plan under its title, as the card and the sheet's page show it.
  content: string;
  view: PlanView;
  wide: boolean;
}

type ViewProps = Pick<PlanHeaderProps, 'view'>;

// As the Written plan tray's row: small ghost buttons.
const controlAppearance = { variant: 'ghost', size: 'xs' } as const;

// The Written plan tray's row: the plan's icon and title, then its controls.
export function PlanHeader(props: PlanHeaderProps): ReactNode {
  return props.wide ? <WideHeader {...props} /> : <PhoneHeader {...props} />;
}

function WideHeader(props: PlanHeaderProps): ReactNode {
  return (
    <View className="h-8 flex-row items-center gap-1.5 pl-2">
      <PlanTitle title={props.title} />
      <FullPageButton view={props.view} />
      <ShowPlanButton view={props.view} />
    </View>
  );
}

const fullPageLabels = { true: 'Restore plan', false: 'Expand plan' } as const;

function FullPageButton({ view }: ViewProps): ReactNode {
  return (
    <IconButton
      {...controlAppearance}
      accessibilityLabel={fullPageLabels[`${view.full}`]}
      icon={view.full ? 'collapse' : 'expand'}
      onPress={view.toggleFull}
    />
  );
}

const showPlanLabels = { true: 'Hide plan', false: 'Show plan' } as const;

// Points down while the plan is hidden, up once it shows.
function ShowPlanButton({ view }: ViewProps): ReactNode {
  return (
    <IconButton
      {...controlAppearance}
      accessibilityLabel={showPlanLabels[`${view.open}`]}
      aria-expanded={view.open}
      icon={view.open ? 'chevron-up' : 'chevron-down'}
      onPress={view.toggleOpen}
    />
  );
}

// In the request's sheet the row opens the plan as the sheet's next page, at full height.
function PhoneHeader(props: PlanHeaderProps): ReactNode {
  return (
    <View className="px-4">
      <PlanPageLink {...props} />
    </View>
  );
}

function PlanPageLink(props: PlanHeaderProps): ReactNode {
  const sheet = useOptionalSheet();

  return (
    <Pressable
      role="button"
      accessibilityLabel={showPlanLabels.false}
      onPress={() => openPlanPage(sheet, props)}
    >
      <PhoneRow title={props.title} />
    </Pressable>
  );
}

function PhoneRow({ title }: Pick<PlanHeaderProps, 'title'>): ReactNode {
  return (
    <View className="min-h-11 flex-row items-center gap-1.5">
      <PlanTitle title={title} />
      <Icon role="secondary" name="chevron-up" tone="muted" />
    </View>
  );
}

function openPlanPage(
  sheet: SheetNavigation | undefined,
  { title, content }: Pick<PlanHeaderProps, 'title' | 'content'>,
): void {
  sheet?.push({
    name: 'plan',
    title,
    children: (
      <View className="px-4">
        <PlanDocument content={content} layout="sheet" />
      </View>
    ),
  });
}

function PlanTitle({ title }: Pick<PlanHeaderProps, 'title'>): ReactNode {
  return (
    <>
      <Icon role="control" name="file-text" tone="muted" />
      <View className="min-w-0 flex-1">
        <Text role="secondary" tone="neutral" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </>
  );
}
