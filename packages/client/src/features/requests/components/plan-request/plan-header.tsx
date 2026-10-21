import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import {
  type SheetNavigation,
  useOptionalSheet,
} from '@repo/kit/primitives/overlays/sheet';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { PlanDocument } from '#lib/product/plan-document';
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

/*
 * The plan's title as its heading, then its controls.
 * Left, the title starts on the plan's list markers; right, the chevron's glyph mirrors that inset.
 */
export function PlanHeader(props: PlanHeaderProps): ReactNode {
  return props.wide ? <WideHeader {...props} /> : <PhoneHeader {...props} />;
}

function WideHeader(props: PlanHeaderProps): ReactNode {
  return (
    <View className="h-8 flex-row items-center gap-1 pl-3 pr-1">
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
      iconRole="secondary"
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
      <Icon role="chevron" name="chevron-up" tone="muted" />
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
    <View className="min-w-0 flex-1">
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={2}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
