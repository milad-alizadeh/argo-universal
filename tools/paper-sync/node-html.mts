import type { DesignNode } from './model.mts';
import { escapeHtml, cssName } from './svg.mts';

function text(node: DesignNode): string {
  return escapeHtml(node.textContent ?? '');
}

function frameHtml(node: DesignNode): string {
  if (!['Frame', 'Text'].includes(node.component))
    throw new Error(`Unsupported node type ${node.component}`);

  const styles = Object.entries(node.styles)
    .map(([key, value]) => `${cssName(key)}:${value}`)
    .join(';');

  return `<div layer-name="${escapeHtml(node.name)}" style="${escapeHtml(styles)}">${text(node)}</div>`;
}

export function htmlFor(node: DesignNode): string {
  if (!node.isVisible)
    throw new Error(`Creating hidden layers is not supported: ${node.name}`);

  return node.svg
    ? node.svg.replace('<svg ', `<svg layer-name="${escapeHtml(node.name)}" `)
    : frameHtml(node);
}
