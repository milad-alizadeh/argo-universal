import type { SvgAstNode } from './svg-types';

export function serializeSvg(node: SvgAstNode): string {
  const attributes = serializeAttributes(node);

  if (!node.children.length) return `<${node.tag}${attributes}/>`;

  const children = node.children.map(serializeChild).join('');

  return `<${node.tag}${attributes}>${children}</${node.tag}>`;
}

function serializeAttributes(node: SvgAstNode): string {
  return Object.entries(node.props)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ` ${attributeName(name)}="${String(value)}"`)
    .join('');
}

function serializeChild(child: SvgAstNode | string): string {
  if (typeof child !== 'string') return serializeSvg(child);

  const safeCdata = child.replaceAll(']]>', ']]]]><![CDATA[>');

  return `<![CDATA[${safeCdata}]]>`;
}

function attributeName(name: string): string {
  if (name === 'xlinkHref') return 'xlink:href';

  return name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
