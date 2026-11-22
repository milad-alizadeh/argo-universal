import type { Tone } from '#primitives/content/text';
import type { IconName } from '../../../symbols/icon-names';
import type { FieldGroupKitProps } from '../../kit-props';

type KitLink = FieldGroupKitProps<'FieldGroup.Link'>;

export type FieldLinkMarkData = Omit<
  NonNullable<KitLink['leadingMark']>,
  'icon'
> & {
  icon: IconName;
};

export type FieldLinkRowProps = Omit<KitLink, 'leadingMark'> & {
  // App rows can also draw the stock SVG glyphs the desktop Workbench uses.
  leadingMark?: FieldLinkMarkData;
  status?: { label: string; tone?: Tone };
  roomy?: boolean;
  wrapSubtitle?: boolean;
};
