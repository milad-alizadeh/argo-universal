import {
  productName,
  productCompatibility,
} from '@repo/contracts/product-identity';

export const agentSkill = `---
name: ${productCompatibility.command}
description: Use ${productName} to discover Operations, inspect Projects and Sessions, and delegate work to Agents.
---

When a task needs ${productName}, discover the matching Operations first:

\`${productCompatibility.command} operations <filter> --json\`

Read the returned description and argument schema, then call:

\`${productCompatibility.command} run <id> --params '<json>'\`

Use \`--wait\` to wait for work. If it is still running or waiting for the user,
keep the returned id and use \`${productCompatibility.command} wait <id>\` to check it again.

${productName} enforces Operation scope and asks the user when confirmation is needed.
If the user refuses, stop that Operation and report the refusal.
`;

export const codexRule = `prefix_rule(pattern=["${productCompatibility.command}"], decision="allow")\n`;
