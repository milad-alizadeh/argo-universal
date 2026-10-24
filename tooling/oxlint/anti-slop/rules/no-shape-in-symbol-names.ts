import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

const FORBIDDEN_SYMBOL_NAME = "shape";

function containsForbiddenSymbolName(name: string): boolean {
  return name.toLowerCase().includes(FORBIDDEN_SYMBOL_NAME);
}

/** Return whether an identifier names a statically accessed member owned by another value. */
function isBorrowedMemberName(node: ESTree.Node): boolean {
  const parent = node.parent;

  if (parent === null || parent.type !== "MemberExpression") return false;

  return parent.property === node && parent.computed === false;
}

/** Names a vendor library owns, which a file may use but not coin (for example SwiftUI's `contentShape`). */
function allowedNames(option: unknown): Set<string> {
  if (typeof option !== "object" || option === null || Array.isArray(option)) return new Set();

  const names: unknown = Reflect.get(option, "allowedNames");

  return new Set(Array.isArray(names) ? names.filter((name) => typeof name === "string") : []);
}

/** Ban the case-insensitive substring "shape" in every JavaScript and TypeScript symbol name. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        'Disallow the case-insensitive substring "shape" in JavaScript, TypeScript, private, and JSX symbol names.',
    },
    schema: [
      {
        type: "object",
        properties: { allowedNames: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
  },
  createOnce(context) {
    const reportForbiddenSymbolName = (node: ESTree.Node & { name: string }) => {
      if (!containsForbiddenSymbolName(node.name) || isBorrowedMemberName(node)) return;
      if (allowedNames(context.options?.[0]).has(node.name)) return;
      context.report({
        node,
        messageId: "forbiddenSymbolName",
        data: { name: node.name },
      });
    };

    return {
      Identifier: reportForbiddenSymbolName,
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
