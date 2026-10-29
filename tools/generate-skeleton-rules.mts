import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const names = z.array(z.string());

const nativeLists = z.object({
  classes: names,
  glyphClasses: names,
  vectorClasses: names,
});

// The Skeleton's classification numbers and lists live in one JSON; web, Swift and Kotlin read these generated copies.
const rulesSchema = z.object({
  lineFill: z.number(),
  hairline: z.number(),
  smallControlHeight: z.number(),
  smallControlWidth: z.number(),
  sameSizeTolerance: z.number(),
  roundSlack: z.number(),
  minBarWidthPerHeight: z.number(),
  singleLineMax: z.number(),
  atomic: z.object({
    web: z.object({
      tags: names,
      roles: names,
      glyphTags: names,
      glyphRoles: names,
      vectorTags: names,
    }),
    ios: nativeLists.extend({
      hostClasses: names,
      glyphLayerClasses: names,
      textLayerClasses: names,
    }),
    android: nativeLists,
  }),
});

export type SkeletonRules = z.infer<typeof rulesSchema>;

const root = fileURLToPath(new URL('..', import.meta.url));

const modulePath = 'apps/universal-app/modules/argo-skeleton/';

export const rulesSource = `${modulePath}skeleton-rules.json`;

export const rulesTargets = {
  web: 'packages/kit/src/primitives/status/skeleton/skeleton-rules.gen.ts',
  ios: `${modulePath}ios/SkeletonRules.swift`,
  android: `${modulePath}android/src/main/java/expo/modules/argoskeleton/SkeletonRules.kt`,
};

const quoted = (names: string[]): string =>
  names.map((name) => JSON.stringify(name)).join(', ');

const header = `Generated from ${rulesSource} by tools/generate-skeleton-rules.mts; do not edit.`;

export function webSource(rules: SkeletonRules): string {
  return (
    `// ${header}
export const skeletonRules = {
  lineFill: ${rules.lineFill},
  hairline: ${rules.hairline},
  smallControlHeight: ${rules.smallControlHeight},
  smallControlWidth: ${rules.smallControlWidth},
  sameSizeTolerance: ${rules.sameSizeTolerance},
  roundSlack: ${rules.roundSlack},
  minBarWidthPerHeight: ${rules.minBarWidthPerHeight},
` + webLists(rules)
  );
}

function webLists(rules: SkeletonRules): string {
  return `  atomicTags: new Set([${quoted(rules.atomic.web.tags)}]),
  atomicRoles: new Set([${quoted(rules.atomic.web.roles)}]),
  glyphTags: new Set([${quoted(rules.atomic.web.glyphTags)}]),
  glyphRoles: new Set([${quoted(rules.atomic.web.glyphRoles)}]),
  vectorTags: new Set([${quoted(rules.atomic.web.vectorTags)}]),
};
`;
}

export function swiftSource(rules: SkeletonRules): string {
  return (
    `import UIKit

// ${header}
enum SkeletonRules {
  static let lineFill: CGFloat = ${rules.lineFill}
  static let hairline: CGFloat = ${rules.hairline}
  static let smallControlHeight: CGFloat = ${rules.smallControlHeight}
  static let smallControlWidth: CGFloat = ${rules.smallControlWidth}
  static let sameSizeTolerance: CGFloat = ${rules.sameSizeTolerance}
  static let roundSlack: CGFloat = ${rules.roundSlack}
  static let minBarWidthPerHeight: CGFloat = ${rules.minBarWidthPerHeight}
` + swiftLists(rules)
  );
}

function swiftLists(rules: SkeletonRules): string {
  return `  static let singleLineMax: CGFloat = ${rules.singleLineMax}
  static let atomicClasses = [${quoted(rules.atomic.ios.classes)}]
  static let glyphClasses = [${quoted(rules.atomic.ios.glyphClasses)}]
  static let vectorClasses = [${quoted(rules.atomic.ios.vectorClasses)}]
  static let hostClasses = [${quoted(rules.atomic.ios.hostClasses)}]
  static let glyphLayerClasses = [${quoted(rules.atomic.ios.glyphLayerClasses)}]
  static let textLayerClasses = [${quoted(rules.atomic.ios.textLayerClasses)}]
}
`;
}

export function kotlinSource(rules: SkeletonRules): string {
  return (
    `package expo.modules.argoskeleton

// ${header}
object SkeletonRules {
  const val LINE_FILL = ${rules.lineFill}f
  const val HAIRLINE = ${rules.hairline}f
  const val SMALL_CONTROL_HEIGHT = ${rules.smallControlHeight}f
  const val SMALL_CONTROL_WIDTH = ${rules.smallControlWidth}f
  const val SAME_SIZE_TOLERANCE = ${rules.sameSizeTolerance}f
  const val ROUND_SLACK = ${rules.roundSlack}f
  const val MIN_BAR_WIDTH_PER_HEIGHT = ${rules.minBarWidthPerHeight}f
` + kotlinLists(rules)
  );
}

function kotlinLists(rules: SkeletonRules): string {
  return `  val atomicClasses = listOf(${quoted(rules.atomic.android.classes)})
  val glyphClasses = listOf(${quoted(rules.atomic.android.glyphClasses)})
  val vectorClasses = listOf(${quoted(rules.atomic.android.vectorClasses)})
}
`;
}

export const generated = (rules: SkeletonRules): Map<string, string> =>
  new Map([
    [rulesTargets.web, webSource(rules)],
    [rulesTargets.ios, swiftSource(rules)],
    [rulesTargets.android, kotlinSource(rules)],
  ]);

export const readRules = (): SkeletonRules =>
  rulesSchema.parse(JSON.parse(readFileSync(`${root}${rulesSource}`, 'utf8')));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, text] of generated(readRules()))
    writeFileSync(`${root}${path}`, text);
}
