import { pascal } from './story-title-rules.mts';

// A kit component has two halves: its props schema in Contracts and its drawing in `@repo/kit`. They pair by name and by group (ADR-0040).
export interface SchemaEntry {
  name: string;
  // The `group` its Contracts definition names; the kit draws it in the folder of the same name.
  group: string;
}

export interface PairingInput {
  schemas: SchemaEntry[];
  // Drawing folders under `packages/kit/src/primitives/`, as `group/folder`.
  folders: string[];
}

const fieldRow =
  'A FieldGroup row (ADR-0042); it pairs with the FieldGroup schemas on the Plugin wire.';

// A group (`native`) or one folder (`actions/pressable`) that draws no schema of its own, with the reason it is exempt.
export const exemptFolders = {
  'kit-props': 'The kit-wide props types; it draws nothing.',
  native: 'Platform-fork helpers for the drawings, not kit components.',
  'actions/check-button':
    'App-only drawing of a check beside a label; a Plugin sends a FieldGroup.Toggle.',
  'fields/code-field':
    'App-only: one box per character for the code typed into Add a Server (#1502); a Plugin has no code to take.',
  'scaffolds/pinned-footer':
    'App-only: holds one button at the foot of a Screen body; a Plugin has no footer to pin.',
  'actions/pressable':
    'The press and hover primitive the other actions are built on.',
  'content/agent-logo':
    "An Agent's logo from the ACP registry, drawn beside a Picker option; a Plugin sends the option's `logo`.",
  'content/liquid-glass': 'A native surface material; only how it looks.',
  'content/media-url':
    'Resolves the src of Image, Video and Audio; no props of its own.',
  'content/native-text': 'The platform fork of Text.',
  'content/path-text':
    'The file path a code block, a resource or a diff heads with; a Plugin sends the CodeBlock or Resource.',
  'fields/field-date-picker': fieldRow,
  'fields/field-link': fieldRow,
  'fields/field-picker': fieldRow,
  'fields/field-slider': fieldRow,
  'fields/field-text': fieldRow,
  'fields/field-toggle': fieldRow,
  'fields/field-value': fieldRow,
  'fields/field-row':
    'The drawing every FieldGroup row shares; it draws no schema of its own.',
  'controls/rich-textarea':
    'The desktop editor behind the Composer; not on the wire.',
  'layout/spacing': 'The spacing scale the layout components read.',
  'lists/drawer-item': 'The drawer shell draws it; a Plugin has no drawer.',
  'lists/virtual-list-item': 'The virtualised row List draws for ListItem.',
  'overlays/centred-overlay': 'The frame Dialog and Alert share.',
  'overlays/drill': 'App navigation chrome; a Plugin sends a Sheet.',
  'overlays/link-preview': 'App-only preview of a Link target.',
  'overlays/open-state': 'The open and close state the overlays share.',
  'overlays/portal': 'Where overlays mount; no props of its own.',
  'status/chevron': "The chevron the kit's own triggers and rows draw.",
  'status/count-badge': 'App-only badge on rail and drawer items.',
  'status/disclosure-chevron': 'The chevron a collapsible row draws.',
  'status/orb': 'App-only for now; a Plugin sends a Spinner.',
  'status/selected-check': 'The check a selected row draws.',
  'status/skeleton':
    'App-only for now (ADR-0020, ADR-0040): it works its placeholders out from what its children draw, so it has no props for a Plugin to send.',
} satisfies Record<string, string>;

// A schema name that has no drawing folder of its own, with the reason it is exempt.
export const exemptSchemas = {
  Chart: 'Declared for Plugins; no drawing yet.',
} satisfies Record<string, string>;

const schemaFile = 'packages/contracts/src/plugins';

const kitFolder = 'packages/kit/src/primitives';

const kebab = (name: string): string =>
  name.replaceAll(/(?<=[a-z])(?=[A-Z])/g, '-').toLowerCase();

// A compound name (`List.Section`, `Metadata.Avatar`, `Canvas.Rect`) is drawn by its parent's folder, so it pairs through the part before the first dot.
export const parentName = (name: string): string => name.split('.')[0] ?? name;

const groupOf = (path: string): string => path.split('/')[0] ?? '';

const nameOf = (path: string): string => pascal(path.split('/')[1] ?? '');

const exemptFolderKeys = new Set(Object.keys(exemptFolders));

const exemptSchemaNames = new Set(Object.keys(exemptSchemas));

const isExemptFolder = (path: string): boolean =>
  exemptFolderKeys.has(path) || exemptFolderKeys.has(groupOf(path));

const expectedPath = (
  name: string,
  declared: Map<string, SchemaEntry>,
): string => `${declared.get(name)?.group ?? '<group>'}/${kebab(name)}`;

const withoutDrawing = (
  declared: Map<string, SchemaEntry>,
  drawn: Map<string, string>,
): string[] =>
  [...new Set([...declared.keys()].map(parentName))].flatMap(
    (name): string[] =>
      drawn.has(name) || exemptSchemaNames.has(name)
        ? []
        : [
            `${name} has a definition in ${schemaFile}/ but no drawing folder in ${kitFolder}/ (expected ${expectedPath(name, declared)}).`,
          ],
  );

const withoutSchema = (
  declared: Map<string, SchemaEntry>,
  drawn: Map<string, string>,
): string[] =>
  [...drawn].flatMap(([name, path]): string[] =>
    declared.has(name)
      ? []
      : [
          `${kitFolder}/${path} draws ${name}, which has no definition in ${schemaFile}/. Add the definition, or exempt the folder in tools/kit-pairing-rules.mts with a reason.`,
        ],
  );

const misplaced = (
  declared: Map<string, SchemaEntry>,
  drawn: Map<string, string>,
): string[] =>
  [...declared.values()].flatMap(({ name, group }): string[] => {
    const path = drawn.get(name);

    return path === undefined || group === groupOf(path)
      ? []
      : [
          `${name} is defined with group '${group}' but drawn in ${kitFolder}/${path}; change one so the group is the same word.`,
        ];
  });

export const pairingProblems = ({
  schemas,
  folders,
}: PairingInput): string[] => {
  const drawn = drawnFolders(folders);

  const declared = new Map(
    schemas.map((entry): [string, SchemaEntry] => [entry.name, entry]),
  );

  return [
    ...withoutDrawing(declared, drawn),
    ...withoutSchema(declared, drawn),
    ...misplaced(declared, drawn),
  ];
};

function drawnFolders(folders: string[]): Map<string, string> {
  return new Map(
    folders.flatMap((path): [string, string][] =>
      isExemptFolder(path) ? [] : [[nameOf(path), path]],
    ),
  );
}
