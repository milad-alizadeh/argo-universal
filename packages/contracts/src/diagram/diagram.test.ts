import { describe, expect, it } from 'vitest';
import {
  type DiagramPalette,
  checkDiagram,
  diagramLabel,
  diagramTitle,
  drawDiagram,
} from './index';

const palette: DiagramPalette = {
  background: 'token-background',
  text: 'token-text',
  textSecondary: 'token-text-secondary',
  textMuted: 'token-text-muted',
  line: 'token-line',
  arrow: 'token-arrow',
  nodeFill: 'token-node-fill',
  nodeStroke: 'token-node-stroke',
  groupHeader: 'token-group-header',
  innerStroke: 'token-inner-stroke',
  tones: {
    success: {
      fill: 'token-success-fill',
      stroke: 'token-success-stroke',
      text: 'token-success-text',
    },
  },
};

const steering = `---
title: Steering
---
flowchart TD
    A[Cmd+Enter] --> B{Capability?}
    B -->|Yes| C[Send steering request]
    C -->|Accepted| D[Join current Turn]
    classDef hot fill:red
    style C fill:green
    class D success`;

const allowed = new Set([
  'none',
  ...Object.values(palette).filter((value) => typeof value === 'string'),
  ...Object.values(palette.tones.success ?? {}),
]);

const paints = (svg: string): string[] =>
  [...svg.matchAll(/\b(?:fill|stroke)="([^"]+)"/g)].map(
    ([, paint = '']) => paint,
  );

const svgOf = (source: string): string =>
  drawDiagram(source, palette)?.svg ?? '';

const firstId = (svg: string): string | undefined =>
  /id="([^"]+)"/.exec(svg)?.[1];

describe('diagramTitle', () => {
  it('takes the front matter title', () => {
    expect(diagramTitle(steering)).toBe('Steering');
  });

  it('names the kind when there is no title', () => {
    expect(diagramTitle('sequenceDiagram\n A->>B: hi')).toBe(
      'Sequence diagram',
    );
  });

  it('has none before the header arrives', () => {
    expect(diagramTitle('---\ntitle: x')).toBeUndefined();
    expect(diagramTitle('')).toBeUndefined();
  });
});

describe('diagramLabel', () => {
  it('says the kind, then the title', () => {
    expect(diagramLabel(steering)).toBe('Flowchart: Steering');
    expect(diagramLabel('erDiagram\n A ||--o{ B : has')).toBe(
      'Entity relationship diagram',
    );
  });
});

describe('drawDiagram', () => {
  it('paints only with the palette, never a colour the Agent set', () => {
    const svg = svgOf(steering);

    expect(paints(svg).filter((paint) => !allowed.has(paint))).toEqual([]);
    expect(svg).toContain('token-success-fill');
    expect(svg).not.toMatch(/red|green|var\(|<style|@import|\sstyle="/);
  });

  it('gives each diagram its own marker ids', () => {
    const one = svgOf('flowchart LR\n A --> B');
    const two = svgOf('flowchart LR\n A --> C');

    expect(one).toContain(`url(#${firstId(one)})`);
    expect(firstId(one)).not.toBe(firstId(two));
  });

  it('reads arrows written without spaces', () => {
    expect(svgOf('graph LR\n A-->B-->C').match(/class="node"/g)).toHaveLength(
      3,
    );
  });

  it('reports its size, drawing a flowchart with no direction top to bottom', () => {
    expect(drawDiagram('flowchart\n A --> B', palette)).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it.each([
    ['an unsupported kind', 'pie\n "a": 1'],
    ['a fence with only a header', 'flowchart TD'],
    ['a fence of unread lines', 'sequenceDiagram\n garbage here'],
  ])('draws nothing for %s', (_case, source) => {
    expect(drawDiagram(source, palette)).toBeUndefined();
  });
});

describe('checkDiagram', () => {
  it.each([
    steering,
    'sequenceDiagram\n participant A\n loop Every minute\n  A->>B: ping\n end\n Note over A,B: hi',
    'stateDiagram-v2\n [*] --> Idle\n state Idle {\n  [*] --> A\n }\n Idle --> [*]',
    'classDiagram\n class Animal {\n  +eat() void\n }\n Animal <|-- Dog',
    'erDiagram\n CUSTOMER ||--o{ ORDER : places',
  ])('passes %j', (source) => {
    expect(checkDiagram(source)).toEqual({ valid: true });
  });

  it('names the line it cannot read, counted in the fence', () => {
    expect(
      checkDiagram(
        '---\ntitle: x\n---\nsequenceDiagram\n A->>B: hi\n this is not mermaid',
      ),
    ).toMatchObject({ valid: false, problems: [{ line: 6 }] });
  });

  it('refuses a kind Argo cannot draw and lists the ones it can', () => {
    expect(checkDiagram('gantt\n title x')).toMatchObject({
      valid: false,
      problems: [{ line: 1 }],
      supported: expect.arrayContaining(['sequenceDiagram']),
    });
  });

  it('refuses a fence with no header', () => {
    expect(checkDiagram('')).toMatchObject({ valid: false });
  });
});
