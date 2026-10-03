# Session updates use ACP names and shapes, and the adapter contract stays ours

ACP (Agent Client Protocol) is the standard vocabulary for coding agents. Each Session update carries ACP's `sessionUpdate` discriminator and ACP field names. We take the names from ACP v2 where v2 describes whole items (`user_message`, `agent_message`, `agent_thought`, `tool_call_update`, `plan_update`), because each stored Session update is a whole item. ACP's `state_update` values become the `state` of the Session snapshot, not a Session update. We take the rest from ACP v1, which is the stable version. Fields that ACP lacks go in `_meta.argo`, which is ACP's extension slot. Session updates that ACP lacks get ACP-style names, such as `task_update`.

Our Agent adapters do not implement the ACP Agent interface. They map vendor events into our Session updates. ACP v2 is a draft (alpha.7 on 2026-09-30), and the ACP shape cannot carry paged history, background tasks, or Plan proposals yet. Because we borrow only names, a change in v2 costs a rename, not a protocol break.

The glossary follows ACP too: Agent (not Harness), Turn, Stop reason, Elicitation. ACP calls the program that drives an Agent the Client. In Argo that is the Server. Argo avoids the word client, because an App connects to the Server too.
