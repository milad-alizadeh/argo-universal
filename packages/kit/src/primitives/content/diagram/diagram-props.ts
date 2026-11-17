export interface DiagramProps {
  // The Mermaid source inside the fence.
  source: string;
  // True while the fence is still streaming: a placeholder stands in until it closes.
  pending?: boolean;
}
