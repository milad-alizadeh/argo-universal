import type * as ActionListKit from '#primitives/actions/action-list';
import type * as KbdKit from '#primitives/content/kbd';
import type { DetailProps } from '#primitives/scaffolds/detail';
import type { PageProps } from '#primitives/scaffolds/page';
import type * as MetadataKit from '#primitives/scaffolds/metadata';
import type * as EmptyStateKit from '#primitives/status/empty-state';
import type * as StatusDotKit from '#primitives/status/status-dot';
import type * as SvgKit from '#primitives/visual';

export type AdditionalPrimitives = {
  PageProps: PageProps;
  DetailProps: DetailProps;
  ActionGroup: ActionListKit.ActionGroup;
  DeclaredAction: ActionListKit.DeclaredAction;
  MetadataProps: MetadataKit.MetadataProps;
  MetadataLabelProps: MetadataKit.MetadataLabelProps;
  MetadataLinkProps: MetadataKit.MetadataLinkProps;
  MetadataPillsProps: MetadataKit.MetadataPillsProps;
  MetadataStatusDotProps: MetadataKit.MetadataStatusDotProps;
  MetadataAvatarProps: MetadataKit.MetadataAvatarProps;
  KbdProps: KbdKit.KbdProps;
  ActionListProps: ActionListKit.ActionListProps;
  ActionProps: ActionListKit.ActionProps;
  ActionSectionProps: ActionListKit.ActionSectionProps;
  ActionShortcut: ActionListKit.ActionShortcut;
  EmptyStateProps: EmptyStateKit.EmptyStateProps;
  StatusDotProps: StatusDotKit.StatusDotProps;
  SvgProps: SvgKit.SvgProps;
};
