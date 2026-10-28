export const agentSkill = `---
name: argo
description: Use Argo to discover Operations, inspect Projects and Sessions, and delegate work to Agents.
---

When a task needs Argo, discover the matching Operations first:

\`argo operations <filter> --json\`

Read the returned description and argument schema, then call:

\`argo run <id> --params '<json>'\`

Use \`--wait\` to wait for work. If it is still running or waiting for the user,
keep the returned id and use \`argo wait <id>\` to check it again.

Argo asks the user before Operations outside your Session's scope. If the user
refuses, stop that Operation and report the refusal.
`;

export const codexRule = 'prefix_rule(pattern=["argo"], decision="allow")\n';
