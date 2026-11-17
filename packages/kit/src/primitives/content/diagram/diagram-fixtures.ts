import type { DiagramProps } from './diagram-props';

export const flowchartDiagram = {
  source: `---
title: Request flow
---
flowchart TD
  A[Request] --> B{Valid?}
  B -->|Yes| C[Handle request]
  C -->|Done| D[Respond]
  C -->|Error| E[Report error]
  B -->|No| E
  class D success
  class E danger`,
} satisfies DiagramProps;

export const sequenceDiagram = {
  source: `sequenceDiagram
  participant A as Client
  participant B as Service
  A->>B: Request
  B-->>A: Response
  loop Every minute
    A-)B: Ping
  end`,
} satisfies DiagramProps;

export const tallDiagram = {
  source: `flowchart TD
  A[Step one] --> B[Step two] --> C[Step three] --> D[Step four]
  D --> E[Step five] --> F[Step six] --> G[Step seven] --> H[Step eight]
  H --> I[Step nine] --> J[Step ten]`,
} satisfies DiagramProps;

export const streamingDiagram = {
  source: `---
title: Request flow
---
flowchart TD
  A[Request] --> B{Val`,
  pending: true,
} satisfies DiagramProps;

export const unsupportedDiagram = {
  source: `gantt
  title Schedule
  section One
  Task :a1, 2024-01-01, 30d`,
} satisfies DiagramProps;
