import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { PairingRules } from './layer-pairing.mts';

// A variation's declared difference from its base: layer path → property → value (null: unset).
const propsSchema = z.record(
  z.string(),
  z.record(z.string(), z.string().nullable()),
);

const masterEntrySchema = z.strictObject({
  name: z.string().min(1),
  id: z.string().min(1),
  // A container whose content changes with each use: only its root is compared.
  shell: z.boolean().optional(),
  variantOf: z.string().optional(),
  props: propsSchema.optional(),
});

const registrySchema = z.strictObject({
  fileId: z.string(),
  // Artboards whose copies are left out of the audit and sync, such as deliberate comparisons.
  ignoredArtboards: z.array(z.string()).optional(),
  // Frames on component cards that are demos or samples, not components.
  notComponents: z.array(z.string()).optional(),
  masters: z.array(masterEntrySchema),
});

export type Props = z.infer<typeof propsSchema>;
export type MasterEntry = z.infer<typeof masterEntrySchema>;
export type Registry = z.infer<typeof registrySchema>;

function duplicateNames(registry: Registry): string[] {
  const seen = new Set<string>();
  return registry.masters
    .map((entry): string => entry.name)
    .filter((name): boolean => seen.has(name) || !seen.add(name));
}

function entriesByName(registry: Registry): Map<string, MasterEntry> {
  return new Map(
    registry.masters.map((entry): [string, MasterEntry] => [entry.name, entry]),
  );
}

function isUsableBase(base: MasterEntry | undefined): boolean {
  return base !== undefined && base.variantOf === undefined;
}

function unknownBases(registry: Registry): string[] {
  const entries = entriesByName(registry);
  return registry.masters
    .flatMap((entry): [string, string][] =>
      entry.variantOf === undefined ? [] : [[entry.name, entry.variantOf]],
    )
    .filter(([, base]): boolean => !isUsableBase(entries.get(base)))
    .map(([name, base]): string => `${name} → ${base}`);
}

export function parseRegistry(text: string): Registry {
  const registry = registrySchema.parse(JSON.parse(text));
  const problems = [
    ...duplicateNames(registry).map(
      (name): string => `"${name}" is registered twice`,
    ),
    ...unknownBases(registry).map(
      (link): string =>
        `variantOf must name a registered base that is not a variation: ${link}`,
    ),
  ];
  if (problems.length > 0) throw new Error(problems.join('\n'));
  return registry;
}

export function readRegistry(path: string): Registry {
  return parseRegistry(readFileSync(path, 'utf8'));
}

export function formatRegistry(registry: Registry): string {
  const masters = registry.masters.toSorted((a, b): number =>
    a.name.localeCompare(b.name),
  );
  return `${JSON.stringify({ ...registry, masters }, null, 2)}\n`;
}

function familyOf(
  entries: Map<string, MasterEntry>,
  name: string,
): string | undefined {
  const entry = entries.get(name);
  return entry && (entry.variantOf ?? entry.name);
}

export function pairingRules(registry: Registry): PairingRules {
  const entries = entriesByName(registry);
  return {
    isMaster: (name): boolean => entries.has(name),
    isStateSwitch: (masterName, copyName): boolean =>
      familyOf(entries, masterName) !== undefined &&
      familyOf(entries, masterName) === familyOf(entries, copyName),
  };
}
