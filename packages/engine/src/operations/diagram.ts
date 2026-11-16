import { checkDiagram } from '@repo/contracts/kit-diagram';
import type { diagramOperations } from '@repo/contracts/operations/diagram';
import type { OperationImplementations } from './operations';

type DiagramImplementations = Pick<
  OperationImplementations,
  keyof typeof diagramOperations
>;

// The Server checks a fence with the renderer the Apps draw it with, so a pass means it draws.
export function createDiagramOperations(): DiagramImplementations {
  return {
    'diagram.validate': async ({ source }) => checkDiagram(source),
  };
}
