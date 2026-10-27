export type MetadataPlatform = 'ios' | 'android' | 'web';

// How much room the Metadata has: its own column beside the content, or a container too narrow for one.
export type MetadataWidth = 'column' | 'narrow';

export interface MetadataFacts {
  platform: MetadataPlatform;
  // Metadata sits in a List, such as a Settings page, as one more section of it.
  inList: boolean;
  width: MetadataWidth;
}

/*
 * The four ways Metadata draws: a section of the List it sits in, the grouped List of rows a phone draws on its own,
 * the headed Properties column of desktop and web, and one inline line of values when that column has no room.
 */
export type MetadataRoot =
  | 'list-section'
  | 'grouped-rows'
  | 'properties'
  | 'inline';

// How one field draws its label and value; the drawing decides it, so a field never asks the platform.
export type MetadataFieldLayout = 'beside' | 'under' | 'stacked' | 'inline';

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

/*
 * Outside a List: phones draw grouped rows at any width; the web's column gives way to one line when it has no room.
 */
// A root that lays every field out one way; the rest follow the platform's rows.
const rootFields: Partial<Record<MetadataRoot, MetadataFieldLayout>> = {
  inline: 'inline',
  properties: 'stacked',
};

const phoneRoots = { column: 'grouped-rows', narrow: 'grouped-rows' } as const;

const ownRoots = {
  ios: phoneRoots,
  android: phoneRoots,
  web: { column: 'properties', narrow: 'inline' },
} satisfies Record<MetadataPlatform, Record<MetadataWidth, MetadataRoot>>;

const rootOf = ({ platform, inList, width }: MetadataFacts): MetadataRoot =>
  inList ? 'list-section' : ownRoots[platform][width];

const fieldOf = (
  root: MetadataRoot,
  platform: MetadataPlatform,
): MetadataFieldLayout => rootFields[root] ?? rowLayouts[platform];

/*
 * The one place that decides how Metadata draws, from the platform, whether it sits in a List and how much width it has.
 * Metadata draws the root it names and each field draws its one layout.
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
