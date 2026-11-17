import {
  type DiagramTone,
  type ToneRole,
  diagramTones,
  toneSentinel,
} from './diagram-markup';

export interface DiagramPalette {
  // The card under the diagram: edge labels sit on it, cutting the lines behind them.
  background: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  line: string;
  arrow: string;
  nodeFill: string;
  nodeStroke: string;
  groupHeader: string;
  innerStroke: string;
  tones: Partial<Record<DiagramTone, Record<ToneRole, string>>>;
}

type Role = Exclude<keyof DiagramPalette, 'tones'>;

const variableRoles = new Map<string, Role>([
  ['--bg', 'background'],
  ['--fg', 'text'],
  ['--_text', 'text'],
  ['--_text-sec', 'textSecondary'],
  ['--_text-muted', 'textMuted'],
  ['--_text-faint', 'textMuted'],
  ['--_line', 'line'],
  ['--_arrow', 'arrow'],
  ['--_node-fill', 'nodeFill'],
  ['--_node-stroke', 'nodeStroke'],
  ['--_group-fill', 'background'],
  ['--_group-hdr', 'groupHeader'],
  ['--_inner-stroke', 'innerStroke'],
  ['--_key-badge', 'groupHeader'],
]);

// A variable this table does not know falls back to the text colour rather than to nothing.
function variableColour(palette: DiagramPalette, variable: string): string {
  const role = variableRoles.get(variable) ?? 'text';

  return palette[role];
}

export function resolveVariables(svg: string, palette: DiagramPalette): string {
  return svg.replaceAll(/var\((--[\w-]+)\)/g, (_match, name: string) =>
    variableColour(palette, name),
  );
}

function toneColour(
  palette: DiagramPalette,
  tone: DiagramTone,
  role: ToneRole,
): string {
  return palette.tones[tone]?.[role] ?? variableColour(palette, '--fg');
}

export function resolveTones(svg: string, palette: DiagramPalette): string {
  const roles: ToneRole[] = ['fill', 'stroke', 'text'];

  return diagramTones.reduce(
    (drawn, tone) =>
      roles.reduce(
        (text, role) =>
          text.replaceAll(
            toneSentinel(tone, role),
            toneColour(palette, tone, role),
          ),
        drawn,
      ),
    svg,
  );
}
