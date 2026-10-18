import {
  attributesFor,
  allowedElements,
  referenceAttributes,
  urlAttributes,
} from './svg-attribute-rules';
import {
  attributeValue,
  validateAttribute,
  validateId,
  validateLocalReference,
  validateUrlReference,
} from './svg-attribute-validation';
import { svgDepthLimit, svgElementLimit, type SvgAstNode } from './svg-types';

interface ValidationState {
  ids: Set<string>;
  elements: number;
}

interface PropContext {
  allowed: ReadonlySet<string>;
  ids: Set<string>;
}

export function validateSvgTree(root: SvgAstNode): void {
  const state: ValidationState = { ids: new Set(), elements: 0 };

  visit(root, state, 1);
  validateReferences(root, state.ids);
}

function visit(node: SvgAstNode, state: ValidationState, depth: number): void {
  state.elements += 1;
  validateLimits(state, depth);
  validateElement(node);
  validateProps(node, state.ids);

  for (const child of node.children) visitChild(child, state, depth);
}

function validateLimits(state: ValidationState, depth: number): void {
  if (depth > svgDepthLimit)
    throw new Error(`depth cap exceeded (${svgDepthLimit})`);

  if (state.elements > svgElementLimit)
    throw new Error(`element cap exceeded (${svgElementLimit})`);
}

function visitChild(
  child: SvgAstNode | string,
  state: ValidationState,
  depth: number,
): void {
  if (typeof child !== 'string') visit(child, state, depth + 1);
}

function validateElement(node: SvgAstNode): void {
  if (!allowedElements.has(node.tag))
    throw new Error(`element <${node.tag}> refused`);
}

function validateProps(node: SvgAstNode, ids: Set<string>): void {
  const allowed = attributesFor(node.tag);

  if (!allowed) throw new Error(`element <${node.tag}> refused`);

  const context = { allowed, ids };

  for (const [name, value] of Object.entries(node.props))
    validateProp(name, value, context);
}

function validateProp(
  name: string,
  rawValue: string | number,
  context: PropContext,
): void {
  ensureAllowed(name, context.allowed);

  const value = attributeValue(rawValue);

  validateNamespace(name, value);
  recordId(name, value, context.ids);
  validateAttribute(name, value);
}

function ensureAllowed(name: string, allowed: ReadonlySet<string>): void {
  if (!allowed.has(name)) throw new Error(`attribute ${name} refused`);
}

function validateNamespace(name: string, value: string): void {
  if (name === 'xmlns' && value !== 'http://www.w3.org/2000/svg')
    throw new Error('only the SVG namespace is allowed');
}

function recordId(name: string, value: string, ids: Set<string>): void {
  if (name === 'id') validateId(value, ids);
}

function validateReferences(node: SvgAstNode, ids: Set<string>): void {
  for (const [name, value] of Object.entries(node.props))
    validateStringReference(name, value, ids);

  for (const child of node.children) validateChildReferences(child, ids);
}

function validateStringReference(
  name: string,
  value: string | number,
  ids: Set<string>,
): void {
  if (typeof value === 'string') validateReference(name, value, ids);
}

function validateChildReferences(
  child: SvgAstNode | string,
  ids: Set<string>,
): void {
  if (typeof child !== 'string') validateReferences(child, ids);
}

function validateReference(
  name: string,
  value: string,
  ids: Set<string>,
): void {
  validateHrefReference(name, value, ids);
  validateUrlReferenceByName(name, value, ids);
}

function validateHrefReference(
  name: string,
  value: string,
  ids: Set<string>,
): void {
  if (referenceAttributes.has(name)) validateLocalReference(value, ids);
}

function validateUrlReferenceByName(
  name: string,
  value: string,
  ids: Set<string>,
): void {
  if (urlAttributes.has(name) && value.includes('url('))
    validateUrlReference(value, ids);
}
