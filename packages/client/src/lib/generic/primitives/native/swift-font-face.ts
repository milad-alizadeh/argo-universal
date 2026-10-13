type SwiftFontFace = {
  family?: string;
  design?: 'monospaced';
};

// SwiftUI has no font named "System" or "ui-monospace": React Native resolves those names, SwiftUI needs a design instead.
const systemFaces = new Map<string, SwiftFontFace>([
  ['System', {}],
  ['ui-monospace', { design: 'monospaced' }],
]);

export function swiftFontFace(family: string | undefined): SwiftFontFace {
  if (family === undefined) return {};

  return systemFaces.get(family) ?? { family };
}
