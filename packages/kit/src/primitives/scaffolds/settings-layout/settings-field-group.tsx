import { isStockIconName } from '@repo/contracts/kit-symbols';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { isRoute } from '#primitives/content/link';
import { FieldGroup } from '#primitives/fields/field-group';
import type {
  SettingsLayoutItem,
  SettingsLayoutProps,
  SettingsLayoutSections,
} from './settings-layout-props';

type Props = Pick<SettingsLayoutProps, 'onSelect' | 'lastSection'> & {
  sections: SettingsLayoutSections;
};

/*
 * Settings' pages as a phone's Settings draws them: one FieldGroup, a section per group and a Link per page, with the
 * last section after them (owner, 2026-10-25).
 */
export function SettingsFieldGroup(props: Props): ReactElement {
  return (
    <FieldGroup>
      {props.sections.map((section, index) => (
        <FieldGroup.Section key={section.title ?? index} title={section.title}>
          {section.items.map((item) => pageLink(item, props.onSelect))}
        </FieldGroup.Section>
      ))}
      {props.lastSection}
    </FieldGroup>
  );
}

const pageLink = (
  item: SettingsLayoutItem,
  onSelect: Props['onSelect'],
): ReactElement => (
  <FieldGroup.Link
    key={item.id}
    title={item.title}
    leading={leadingIcon(item.icon)}
    value={linkValue(item)}
    disabled={item.disabled}
    onPress={() => openPage(item.href, onSelect)}
  />
);

// A row has no badge, so a status the value does not already say follows it.
function linkValue(item: SettingsLayoutItem): string | undefined {
  const status = statusLabel(item.badge);
  const parts = [item.value, status === item.value ? undefined : status];

  return parts.filter(Boolean).join(', ') || undefined;
}

const statusLabel = (badge: SettingsLayoutItem['badge']): string | undefined =>
  typeof badge === 'object' && badge.kind === 'status'
    ? badge.label
    : undefined;

type Leading = React.ComponentProps<typeof FieldGroup.Link>['leading'];

const leadingIcon = (icon: SettingsLayoutItem['icon']): Leading =>
  icon && isStockIconName(icon) ? icon : undefined;

// The App's router when it gives one, else the row's own route.
function openPage(href: string, onSelect: Props['onSelect']): void {
  if (onSelect) onSelect(href);
  else if (isRoute(href)) router.navigate(href);
}
