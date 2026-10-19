import { parseExpression } from '@babel/parser';
import {
  cssName,
  escapeHtml,
  literal,
  styleLiteral,
  type Element,
} from './svg-literals.mts';

export { cssName, escapeHtml } from './svg-literals.mts';

const tags = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'clipPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'title',
]);

type Attribute = Element['openingElement']['attributes'][number];

type Value = Extract<Attribute, { type: 'JSXAttribute' }>['value'];

function attributeValue(name: string, value: Value): string {
  if (!value) throw new Error('SVG attribute must be static');

  if (value.type === 'StringLiteral') return value.value;

  return containerValue(name, value);
}

function containerValue(name: string, value: NonNullable<Value>): string {
  if (value.type !== 'JSXExpressionContainer')
    throw new Error('SVG attribute must be static');

  return expressionValue(name, value.expression);
}

function expressionValue(
  name: string,
  expression: Extract<
    NonNullable<Value>,
    { type: 'JSXExpressionContainer' }
  >['expression'],
): string {
  if (expression.type === 'JSXEmptyExpression')
    throw new Error('Empty JSX expression');

  return name === 'style' ? styleLiteral(expression) : literal(expression);
}

function attributeName(attr: Attribute): string {
  if (attr.type !== 'JSXAttribute')
    throw new Error('Unsupported SVG attribute');

  if (attr.name.type !== 'JSXIdentifier')
    throw new Error('Unsupported SVG attribute name');

  return attr.name.name;
}

function safeAttribute(name: string): void {
  if (name.startsWith('on') || name === 'href')
    throw new Error(`Unsafe SVG attribute ${name}`);
}

function attribute(attr: Attribute): string {
  const name = attributeName(attr);

  if (name === 'id') return '';
  safeAttribute(name);

  return renderAttribute(name, attr);
}

function renderAttribute(name: string, attr: Attribute): string {
  if (attr.type !== 'JSXAttribute')
    throw new Error('Unsupported SVG attribute');
  const outputName = name === 'viewBox' ? name : cssName(name);

  return ` ${outputName}="${escapeHtml(attributeValue(name, attr.value))}"`;
}

function childMarkup(child: Element['children'][number]): string {
  if (child.type === 'JSXText') return escapeHtml(child.value.trim());

  if (child.type === 'JSXElement') return render(child);
  throw new Error('Unsupported SVG child');
}

function render(element: Element): string {
  const name = element.openingElement.name;

  if (name.type !== 'JSXIdentifier') throw new Error('Unsupported SVG tag');

  if (!tags.has(name.name)) throw new Error('Unsupported SVG tag');
  const attributes = element.openingElement.attributes.map(attribute).join('');

  return `<${name.name}${attributes}>${element.children.map(childMarkup).join('')}</${name.name}>`;
}

export function svgFromJsx(jsx: string): string {
  if (/url\(\s*["']?#/.test(jsx))
    throw new Error(
      'SVG definition references require an explicit transfer implementation',
    );
  const expression = parseExpression(jsx, { plugins: ['jsx'] });

  if (expression.type !== 'JSXElement')
    throw new Error('Expected a static SVG element');

  return render(expression);
}
