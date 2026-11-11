import type { AsidePlace } from '../screen/screen-aside-place';

export type MetadataPlatform = 'ios' | 'android' | 'web';

export interface MetadataFacts {
  platform: MetadataPlatform;
  // Metadata sits in a List, such as a Settings page, as one more section of it.
  inList: boolean;
  // Where a Screen's aside put it (screen-aside-place.ts); null anywhere else.
  place: AsidePlace | null;
}

/*
 * The ways Metadata draws: a section of the List it sits in; the grouped List of rows a phone draws on its own; the
 * aside's column of values under small headings; and, where the aside has no column, a row of Pills under the title,
 * which shows each value's icon alone below medium.
 */
export type MetadataRoot =
  | 'list-section'
  | 'grouped-rows'
  | 'aside'
  | 'pills'
  | 'icons';

/*
 * How one field draws: as a row's label and value (`beside`, `under`, `stacked`), as its value alone under its
 * group's heading (`value`), or as one Pill (`pill`, or `icon` for a Pill that shows its icon alone).
 */
export type MetadataFieldLayout =
  | 'beside'
  | 'under'
  | 'stacked'
  | 'value'
  | 'pill'
  | 'icon';

export interface MetadataDrawing {
  root: MetadataRoot;
  field: MetadataFieldLayout;
  // Phones mute a value as a trailing detail; desktop keeps foreground.
  mutedValue: boolean;
  dotSize: 'sm' | 'md';
}

const rowLayouts = {
  ios: 'beside',
  android: 'under',
  web: 'stacked',
} satisfies Record<MetadataPlatform, MetadataFieldLayout>;

// Outside an aside and a List, a phone draws grouped rows and the web the aside's own column.
const ownRoots = {
  ios: 'grouped-rows',
  android: 'grouped-rows',
  web: 'aside',
} satisfies Record<MetadataPlatform, MetadataRoot>;

// A root that lays every field out one way; the rest follow the platform's rows.
const rootFields: Partial<Record<MetadataRoot, MetadataFieldLayout>> = {
  aside: 'value',
  pills: 'pill',
  icons: 'icon',
};

function rootOf({ platform, inList, place }: MetadataFacts): MetadataRoot {
  if (place) return place;

  return inList ? 'list-section' : ownRoots[platform];
}

const fieldOf = (
  root: MetadataRoot,
  platform: MetadataPlatform,
): MetadataFieldLayout => rootFields[root] ?? rowLayouts[platform];

/*
 * The one place that decides how Metadata draws, from the platform, whether it sits in a List and where a Screen's
 * aside put it. Metadata draws the root it names and each field draws its one layout.
 */
export function metadataDrawing(facts: MetadataFacts): MetadataDrawing {
  const root = rootOf(facts);

  return {
    root,
    field: fieldOf(root, facts.platform),
    mutedValue: facts.platform !== 'web',
    dotSize: facts.platform === 'ios' ? 'md' : 'sm',
  };
}
