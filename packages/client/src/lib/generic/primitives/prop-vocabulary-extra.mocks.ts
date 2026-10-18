import type * as ActionListKit from '#primitives/actions/action-list';
import type * as KbdKit from '#primitives/content/kbd';
import type { PageProps } from '#primitives/scaffolds/page';
import type * as EmptyStateKit from '#primitives/status/empty-state';
import type * as StatusDotKit from '#primitives/status/status-dot';
import type * as SvgKit from '#primitives/visual';

export type AdditionalPrimitives = {
  PageProps: PageProps;
  ActionGroup: ActionListKit.ActionGroup;
  DeclaredAction: ActionListKit.DeclaredAction;
  KbdProps: KbdKit.KbdProps;
  ActionListProps: ActionListKit.ActionListProps;
  ActionProps: ActionListKit.ActionProps;
  ActionSectionProps: ActionListKit.ActionSectionProps;
  ActionShortcut: ActionListKit.ActionShortcut;
  EmptyStateProps: EmptyStateKit.EmptyStateProps;
  StatusDotProps: StatusDotKit.StatusDotProps;
  SvgProps: SvgKit.SvgProps;
};
