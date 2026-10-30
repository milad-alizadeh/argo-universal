import { scanMarkup } from './markup';
import { serializeSvg } from './serialization';
import { validateSvgTree } from './tree-validation';
import {
  svgCharacterLimit,
  type SvgAstNode,
  type SvgParser,
  type SvgSanitization,
} from './types';

export { svgCharacterLimit, svgDepthLimit, svgElementLimit } from './types';

export type { SvgParser, SvgSanitization } from './types';

export function sanitizeSvg(xml: string, parse: SvgParser): SvgSanitization {
  if (xml.length > svgCharacterLimit)
    return refused(`character cap exceeded (${svgCharacterLimit})`);

  return sanitizeInput(xml, parse);
}

function sanitizeInput(xml: string, parse: SvgParser): SvgSanitization {
  const scan = scanInput(xml);

  if (!scan.ok) return scan;

  if (scan.roots !== 1) return refused('exactly one root element is required');

  return sanitizeTree(xml, parse);
}

type Scanned = { ok: true; roots: number } | { ok: false; reason: string };

function scanInput(xml: string): Scanned {
  try {
    return scanResult(scanMarkup(xml));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid XML';

    return { ok: false, reason };
  }
}

function scanResult(scan: ReturnType<typeof scanMarkup>): Scanned {
  if (scan.declarations)
    return { ok: false, reason: `${scan.declarations} declaration refused` };

  return { ok: true, roots: scan.roots };
}

function sanitizeTree(xml: string, parse: SvgParser): SvgSanitization {
  const parsed = parseInput(xml, parse);

  if (!parsed.ok) return parsed;

  if (parsed.root.tag !== 'svg') return refused('root must be svg');

  return canonicalXml(parsed.root);
}

type Parsed = { ok: true; root: SvgAstNode } | { ok: false; reason: string };

function parseInput(xml: string, parse: SvgParser): Parsed {
  try {
    return parsedResult(parse(xml));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid SVG';

    return { ok: false, reason };
  }
}

function parsedResult(root: SvgAstNode | null): Parsed {
  if (!root) return { ok: false, reason: 'missing root element' };

  return { ok: true, root };
}

function canonicalXml(root: SvgAstNode): SvgSanitization {
  try {
    return serializeValidated(root);
  } catch (error) {
    return refused(error instanceof Error ? error.message : 'invalid SVG');
  }
}

function serializeValidated(root: SvgAstNode): SvgSanitization {
  validateSvgTree(root);

  const xml = serializeSvg(root);

  if (xml.length > svgCharacterLimit)
    return refused(`serialized character cap exceeded (${svgCharacterLimit})`);

  return { ok: true, xml };
}

function refused(reason: string): SvgSanitization {
  return { ok: false, reason };
}
