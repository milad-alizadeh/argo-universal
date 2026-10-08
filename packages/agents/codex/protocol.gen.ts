// Generated from codex-cli 0.157.0; run node packages/agents/codex/generate-protocol.ts.

export const codexProtocolVersion = "0.157.0";

export type ClientInfo = { name: string, title: string | null, version: string, };

export type JsonValue = number | string | boolean | Array<JsonValue> | { [key in string]?: JsonValue } | null;

export type InitializeCapabilities = {

explicitGatewayOauth?: boolean,

experimentalApi: boolean,

requestAttestation: boolean,

mcpServerOpenaiFormElicitation?: boolean,

optOutNotificationMethods?: Array<string> | null,

extensions?: { [key in string]?: JsonValue } | null, };

export type InitializeParams = { clientInfo: ClientInfo, capabilities: InitializeCapabilities | null, };

export type AbsolutePathBuf = string;

export type InitializeResponse = { userAgent: string,

codexHome: AbsolutePathBuf,

platformFamily: string,

platformOs: string, };

export type ModelListParams = {

cursor?: string | null,

limit?: number | null,

includeHidden?: boolean | null, };

export type InputModality = "text" | "image" | "audio";

export type ReasoningEffort = string;

export type CyberAccessProgram = "standard" | "daybreakBlue" | "daybreakRed";

export type ModelAccessPrograms = {

cyber: Array<CyberAccessProgram>, };

export type ModelAvailabilityNux = { message: string, };

export type ModelServiceTier = { id: string, name: string, description: string, };

export type ModelUpgradeInfo = { model: string, upgradeCopy: string | null, modelLink: string | null, migrationMarkdown: string | null,

retirementAt: number | null, };

export type MultiAgentVersion = "disabled" | "v1" | "v2";

export type ReasoningEffortOption = { reasoningEffort: ReasoningEffort, description: string, };

export type Model = { id: string, model: string, upgrade: string | null, upgradeInfo: ModelUpgradeInfo | null, availabilityNux: ModelAvailabilityNux | null, displayName: string, description: string, modelSpecialty: string | null, hidden: boolean, supportedReasoningEfforts: Array<ReasoningEffortOption>, defaultReasoningEffort: ReasoningEffort, inputModalities: Array<InputModality>,

supportsPersonality: boolean,

multiAgentVersion: MultiAgentVersion | null,

additionalSpeedTiers: Array<string>, serviceTiers: Array<ModelServiceTier>,

defaultServiceTier: string | null,

availableAccessPrograms: ModelAccessPrograms | null, isDefault: boolean, };

export type ModelListResponse = { data: Array<Model>,

nextCursor: string | null, };

export type GetAccountParams = {

refreshToken?: boolean, };

export type PlanType = "free" | "go" | "plus" | "pro" | "prolite" | "team" | "self_serve_business_prolite" | "self_serve_business_usage_based" | "business" | "ent26" | "enterprise_cbp_automation" | "enterprise_cbp_usage_based" | "enterprise" | "edu" | "edu_plus" | "edu_pro" | "unknown";

export type Account = { "type": "apiKey", } | { "type": "chatgpt", email: string | null, planType: PlanType, } | { "type": "amazonBedrock", usesCodexManagedCredentials: boolean, };

export type AccountRoutingOverride = "NO_CONSTRAINT" | "us" | "us_cr";

export type WorkspaceRouting = { chatgptAccountId: string, backendOrigin: string, accountRoutingOverride: AccountRoutingOverride, };

export type GetAccountResponse = { account: Account | null, requiresOpenaiAuth: boolean, workspaceRouting: WorkspaceRouting | null, };

export type MultiAgentMode = { "custom": string } | "explicitRequestOnly" | "proactive";

export type Personality = "none" | "friendly" | "pragmatic";

export type ApprovalsReviewer = "user" | "auto_review" | "guardian_subagent";

export type AskForApproval = "untrusted" | "on-request" | { "granular": { sandbox_approval: boolean, rules: boolean, skill_approval: boolean, request_permissions: boolean, mcp_elicitations: boolean, } } | "never";

export type DynamicToolFunctionSpec = { name: string, description: string, inputSchema: JsonValue, deferLoading?: boolean, };

export type DynamicToolNamespaceTool = { "type": "function" } & DynamicToolFunctionSpec;

export type DynamicToolNamespaceSpec = { name: string, description: string, tools: Array<DynamicToolNamespaceTool>, };

export type DynamicToolSpec = { "type": "function" } & DynamicToolFunctionSpec | { "type": "namespace" } & DynamicToolNamespaceSpec;

export type SandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export type CapabilityRootLocation = { "type": "environment", environmentId: string,

path: string, };

export type SelectedCapabilityRoot = {

id: string,

location: CapabilityRootLocation, };

export type ThreadHistoryMode = "legacy" | "paginated";

export type ThreadSource = string;

export type ThreadStartSource = "startup" | "clear";

export type LegacyAppPathString = string;

export type TurnEnvironmentParams = { environmentId: string, cwd: LegacyAppPathString,

runtimeWorkspaceRoots?: Array<LegacyAppPathString> | null, };

export type ThreadStartParams = { model?: string | null, modelProvider?: string | null,

allowProviderModelFallback?: boolean, serviceTier?: string | null | null, cwd?: string | null,

runtimeWorkspaceRoots?: Array<AbsolutePathBuf> | null, approvalPolicy?: AskForApproval | null,

approvalsReviewer?: ApprovalsReviewer | null, sandbox?: SandboxMode | null,

permissions?: string | null, config?: { [key in string]?: JsonValue } | null, serviceName?: string | null, baseInstructions?: string | null, developerInstructions?: string | null,

personality?: Personality | null,

multiAgentMode?: MultiAgentMode | null, ephemeral?: boolean | null,

historyMode?: ThreadHistoryMode | null, sessionStartSource?: ThreadStartSource | null,

threadSource?: ThreadSource | null,

projectId?: string | null,

daybreakEnabled?: boolean | null,

environments?: Array<TurnEnvironmentParams> | null, dynamicTools?: Array<DynamicToolSpec> | null,

selectedCapabilityRoots?: Array<SelectedCapabilityRoot> | null,

mockExperimentalField?: string | null,

experimentalRawEvents?: boolean, };

export type ActivePermissionProfile = {

id: string,

extends: string | null, };

export type NetworkAccess = "restricted" | "enabled";

export type SandboxPolicy = { "type": "dangerFullAccess" } | { "type": "readOnly", networkAccess: boolean, } | { "type": "externalSandbox", networkAccess: NetworkAccess, } | { "type": "workspaceWrite", writableRoots: Array<AbsolutePathBuf>, networkAccess: boolean, excludeTmpdirEnvVar: boolean, excludeSlashTmp: boolean, };

export type GitInfo = { sha: string | null, branch: string | null, originUrl: string | null, };

export type AgentPath = string;

export type ThreadId = string;

export type SubAgentSource = "review" | "compact" | { "thread_spawn": { parent_thread_id: ThreadId, depth: number, agent_path: AgentPath | null, agent_nickname: string | null, agent_role: string | null, } } | "memory_consolidation" | { "other": string };

export type SessionSource = "cli" | "vscode" | "exec" | "appServer" | { "custom": string } | { "subAgent": SubAgentSource } | "unknown";

export type ThreadEnvironment = { environmentId: string, cwd: LegacyAppPathString, runtimeWorkspaceRoots: Array<LegacyAppPathString>, };

export type ThreadExtra = Record<string, never>;

export type ThreadSectionAppearance = { icon: string | null, color: string | null, };

export type ThreadSection = {

id: string,

name: string,

appearance: ThreadSectionAppearance | null, };

export type ThreadActiveFlag = "waitingOnApproval" | "waitingOnUserInput";

export type ThreadStatus = { "type": "notLoaded" } | { "type": "idle" } | { "type": "systemError" } | { "type": "active", activeFlags: Array<ThreadActiveFlag>, };

export type ImageDetail = "auto" | "low" | "high" | "original";

export type FunctionCallOutputContentItem = { "type": "input_text", text: string, } | { "type": "input_image", detail?: ImageDetail, } & ({ image_url: string, } | { file_id: string, }) | { "type": "input_audio", audio_url: string, } | { "type": "encrypted_content", encrypted_content: string, };

export type FunctionCallOutputBody = string | Array<FunctionCallOutputContentItem>;

export type ImageGenerationFailure = { "type": "usageLimitExceeded", limitId: string, resetsAt: number | null, };

export type ImageGenerationItem = { id: string, status: string, revisedPrompt: string | null, result: string, transparentBackground?: boolean, failure: ImageGenerationFailure | null, savedPath?: AbsolutePathBuf, };

export type MessagePhase = "commentary" | "final_answer";

export type SleepItem = { id: string, durationMs: number, };

export type WebSearchAction = { "type": "search", query: string | null, queries: Array<string> | null, } | { "type": "openPage", url: string | null, } | { "type": "findInPage", url: string | null, pattern: string | null, } | { "type": "other" };

export type WebSearchItem = { id: string, query: string, action: WebSearchAction | null,

results: Array<JsonValue> | null, };

export type AgentMessageDelivery = "async";

export type AsyncUserInputQuestion = { title: string, options: Array<string> | null, };

export type CollabAgentStatus = "pendingInit" | "running" | "interrupted" | "completed" | "errored" | "shutdown" | "notFound";

export type CollabAgentState = { status: CollabAgentStatus, message: string | null, };

export type CollabAgentTool = "spawnAgent" | "sendInput" | "resumeAgent" | "wait" | "closeAgent" | "sendMessage" | "followupTask" | "interruptAgent" | "listAgents";

export type CollabAgentToolCallStatus = "inProgress" | "completed" | "failed" | "interrupted";

export type CommandAction = { "type": "read", command: string, name: string, path: LegacyAppPathString, } | { "type": "listFiles", command: string, path: string | null, } | { "type": "search", command: string, query: string | null, path: string | null, } | { "type": "unknown", command: string, };

export type CommandExecutionSource = "agent" | "userShell" | "unifiedExecStartup" | "unifiedExecInteraction";

export type CommandExecutionStatus = "inProgress" | "completed" | "failed" | "declined";

export type DynamicToolCallOutputContentItem = { "type": "inputText", text: string, } | { "type": "inputImage", imageUrl: string, } | { "type": "inputAudio", audioUrl: string, };

export type DynamicToolCallStatus = "inProgress" | "completed" | "failed";

export type PatchChangeKind = { "type": "add" } | { "type": "delete" } | { "type": "update", move_path: string | null, };

export type FileUpdateChange = { path: string, kind: PatchChangeKind, diff: string, };

export type HookPromptFragment = { text: string, hookRunId: string, };

export type McpAppDisplayMode = "inline" | "fullscreen";

export type McpAppUi = { resourceUri: string, preferredModelDisplayMode: McpAppDisplayMode, };

export type McpToolCallAppContext = { connectorId: string, linkId: string | null, resourceUri: string | null, appName: string | null, actionName: string | null, };

export type McpToolCallError = { message: string, };

export type McpToolCallResult = { content: Array<JsonValue>, structuredContent: JsonValue | null, _meta: JsonValue | null, };

export type McpToolCallStatus = "inProgress" | "completed" | "failed";

export type MemoryCitationEntry = { path: string, lineStart: number, lineEnd: number, note: string, };

export type MemoryCitation = { entries: Array<MemoryCitationEntry>, threadIds: Array<string>, };

export type PatchApplyStatus = "inProgress" | "completed" | "failed" | "declined";

export type SubAgentActivityKind = "started" | "interacted" | "interrupted" | "completed";

export type ByteRange = { start: number, end: number, };

export type TextElement = {

byteRange: ByteRange,

placeholder: string | null, };

export type UserInput = { "type": "text", text: string,

text_elements: Array<TextElement>, } | { "type": "image", detail?: ImageDetail, } & ({ url: string, } | { fileId: string, }) | { "type": "localImage", detail?: ImageDetail, path: string, } | { "type": "audio", url: string, } | { "type": "localAudio", path: string, } | { "type": "skill", name: string, path: string, } | { "type": "mention", name: string, path: string, };

export type ThreadItem = { "type": "userMessage", id: string, clientId: string | null, content: Array<UserInput>, } | { "type": "hookPrompt", id: string, fragments: Array<HookPromptFragment>, } | { "type": "agentMessage", id: string, text: string, phase: MessagePhase | null, memoryCitation: MemoryCitation | null, delivery: AgentMessageDelivery | null, questions: Array<AsyncUserInputQuestion> | null, } | { "type": "functionCallOutput", id: string, name: string, namespace: string | null, output: FunctionCallOutputBody, } | { "type": "plan", id: string, text: string, } | { "type": "reasoning", id: string, summary: Array<string>, content: Array<string>, } | { "type": "commandExecution", id: string,

pluginId: string | null,

scriptPath: string | null,

command: string,

cwd: LegacyAppPathString,

processId: string | null, source: CommandExecutionSource, status: CommandExecutionStatus,

commandActions: Array<CommandAction>,

aggregatedOutput: string | null,

exitCode: number | null,

durationMs: number | null, } | { "type": "fileChange", id: string, changes: Array<FileUpdateChange>, status: PatchApplyStatus, } | { "type": "mcpToolCall", id: string, server: string, tool: string, status: McpToolCallStatus, arguments: JsonValue, appContext: McpToolCallAppContext | null,

mcpAppResourceUri?: string,

mcpAppUi: McpAppUi | null, pluginId: string | null, readOnlyHint: boolean | null, result: McpToolCallResult | null, error: McpToolCallError | null,

durationMs: number | null, } | { "type": "dynamicToolCall", id: string, namespace: string | null, tool: string, arguments: JsonValue, status: DynamicToolCallStatus, contentItems: Array<DynamicToolCallOutputContentItem> | null, success: boolean | null,

durationMs: number | null, } | { "type": "collabAgentToolCall",

id: string,

tool: CollabAgentTool,

status: CollabAgentToolCallStatus,

senderThreadId: string,

receiverThreadIds: Array<string>,

prompt: string | null,

model: string | null,

reasoningEffort: ReasoningEffort | null,

agentsStates: { [key in string]?: CollabAgentState }, } | { "type": "subAgentActivity", id: string, kind: SubAgentActivityKind, agentThreadId: string, agentPath: string, } | { "type": "webSearch" } & WebSearchItem | { "type": "imageView", id: string, path: LegacyAppPathString, } | { "type": "sleep" } & SleepItem | { "type": "imageGeneration" } & ImageGenerationItem | { "type": "enteredReviewMode", id: string, review: string, } | { "type": "exitedReviewMode", id: string, review: string, } | { "type": "contextCompaction", id: string, };

export type NonSteerableTurnKind = "review" | "compact";

export type CodexErrorInfo = "contextWindowExceeded" | "sessionBudgetExceeded" | "usageLimitExceeded" | "rateLimitExceeded" | "serverOverloaded" | "cyberPolicy" | "misalignmentPolicyViolation" | { "httpConnectionFailed": { httpStatusCode: number | null, } } | { "responseStreamConnectionFailed": { httpStatusCode: number | null, } } | "internalServerError" | "unauthorized" | "badRequest" | "threadRollbackFailed" | "sandboxError" | { "responseStreamDisconnected": { httpStatusCode: number | null, } } | { "responseTooManyFailedAttempts": { httpStatusCode: number | null, } } | { "activeTurnNotSteerable": { turnKind: NonSteerableTurnKind, } } | "other";

export type MisalignmentSteer = { message: string, };

export type MisalignmentErrorDetails = {

errorType: string | null,

detailedExplanation: string | null,

steer: MisalignmentSteer | null, };

export type TurnError = { message: string, codexErrorInfo: CodexErrorInfo | null, additionalDetails: string | null,

misalignment: MisalignmentErrorDetails | null, };

export type TurnItemsView = "notLoaded" | "summary" | "full";

export type TurnStatus = "completed" | "interrupted" | "failed" | "inProgress";

export type Turn = {

id: string,

items: Array<ThreadItem>,

itemsView: TurnItemsView, status: TurnStatus,

error: TurnError | null,

startedAt: number | null,

completedAt: number | null,

durationMs: number | null, };

export type Thread = {

id: string,

environments: Array<ThreadEnvironment> | null,

extra: ThreadExtra | null,

sessionId: string,

forkedFromId: string | null,

parentThreadId: string | null,

preview: string,

ephemeral: boolean,

section: ThreadSection | null,

sectionEnteredAt: number | null,

projectId: string | null,

historyMode: ThreadHistoryMode,

modelProvider: string,

model: string | null,

reasoningEffort: ReasoningEffort | null,

createdAt: number,

updatedAt: number,

recencyAt: number | null,

status: ThreadStatus,

path: string | null,

cwd: AbsolutePathBuf,

cliVersion: string,

originator: string | null,

source: SessionSource,

canAcceptDirectInput: boolean | null,

threadSource: ThreadSource | null,

agentNickname: string | null,

agentRole: string | null,

gitInfo: GitInfo | null,

name: string | null,

daybreakEnabled: boolean | null,

turns: Array<Turn>, };

export type ThreadStartResponse = { thread: Thread, model: string, modelProvider: string, serviceTier: string | null,

disabledPluginIds: Array<string>, cwd: AbsolutePathBuf,

runtimeWorkspaceRoots: Array<AbsolutePathBuf>,

instructionSources: Array<LegacyAppPathString>, approvalPolicy: AskForApproval,

approvalsReviewer: ApprovalsReviewer,

sandbox: SandboxPolicy,

activePermissionProfile: ActivePermissionProfile | null, reasoningEffort: ReasoningEffort | null,

multiAgentMode: MultiAgentMode, };

export type AgentMessageInputContent = { "type": "input_text", text: string, } | { "type": "encrypted_content", encrypted_content: string, };

export type ConfigurationReasoning = { effort: ReasoningEffort, };

export type ContentItem = { "type": "input_text", text: string, } | { "type": "input_image", detail?: ImageDetail, } & ({ image_url: string, } | { file_id: string, }) | { "type": "input_audio", audio_url: string, } | { "type": "output_text", text: string, };

export type InternalChatMessageMetadataPassthrough = { turn_id?: string, };

export type LocalShellExecAction = { command: Array<string>, timeout_ms: bigint | null, working_directory: string | null, env: { [key in string]?: string } | null, user: string | null, };

export type LocalShellAction = { "type": "exec" } & LocalShellExecAction;

export type LocalShellStatus = "completed" | "in_progress" | "incomplete";

export type ReasoningItemContent = { "type": "reasoning_text", text: string, } | { "type": "text", text: string, };

export type ReasoningItemReasoningSummary = { "type": "summary_text", text: string, };

export type ResponseItemId = string;

export type LegacyWebSearchAction = { "type": "search", query?: string, queries?: Array<string>, } | { "type": "open_page", url?: string, } | { "type": "find_in_page", url?: string, pattern?: string, } | { "type": "other" };

export type ResponseItem = { "type": "message", id?: ResponseItemId, role: string, content: Array<ContentItem>, phase?: MessagePhase, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "agent_message", id?: ResponseItemId, author: string, recipient: string, content: Array<AgentMessageInputContent>, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "reasoning", id?: ResponseItemId, summary: Array<ReasoningItemReasoningSummary>, content?: Array<ReasoningItemContent>, encrypted_content: string | null, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "local_shell_call",

id?: ResponseItemId,

call_id: string | null, status: LocalShellStatus, action: LocalShellAction, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "function_call", id?: ResponseItemId, name: string, namespace?: string, arguments: string, encrypted_function_args?: Array<string>, call_id: string, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "tool_search_call", id?: ResponseItemId, call_id: string | null, status?: string, execution: string, arguments: unknown, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "function_call_output", id?: ResponseItemId, call_id?: string, name?: string, namespace?: string, output: FunctionCallOutputBody, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "custom_tool_call", id?: ResponseItemId, status?: string, call_id: string, name: string, namespace?: string, input: string, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "custom_tool_call_output", id?: ResponseItemId, call_id: string, name?: string, output: FunctionCallOutputBody, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "tool_search_output", id?: ResponseItemId, call_id: string | null, status: string, execution: string, tools: unknown[], internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "web_search_call", id?: ResponseItemId, status?: string, action?: LegacyWebSearchAction, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "image_generation_call", id?: ResponseItemId, status: string, revised_prompt?: string, result: string, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "compaction", id?: ResponseItemId, encrypted_content: string, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "configuration_update", reasoning: ConfigurationReasoning, } | { "type": "compaction_trigger", } | { "type": "context_compaction", id?: ResponseItemId, encrypted_content?: string, internal_chat_message_metadata_passthrough?: InternalChatMessageMetadataPassthrough, } | { "type": "other" };

export type SortDirection = "asc" | "desc";

export type ThreadResumeInitialTurnsPageParams = {

limit?: number | null,

sortDirection?: SortDirection | null,

itemsView?: TurnItemsView | null, };

export type ThreadResumeParams = { threadId: string,

history?: Array<ResponseItem> | null,

path?: string | null,

model?: string | null, modelProvider?: string | null, serviceTier?: string | null | null, cwd?: string | null,

runtimeWorkspaceRoots?: Array<AbsolutePathBuf> | null, approvalPolicy?: AskForApproval | null,

approvalsReviewer?: ApprovalsReviewer | null, sandbox?: SandboxMode | null,

permissions?: string | null, config?: { [key in string]?: JsonValue } | null, baseInstructions?: string | null, developerInstructions?: string | null,

personality?: Personality | null,

excludeTurns?: boolean,

initialTurnsPage?: ThreadResumeInitialTurnsPageParams | null, };

export type ModeKind = "plan" | "default";

export type Settings = { model: string, reasoning_effort: ReasoningEffort | null, developer_instructions: string | null, };

export type CollaborationMode = { mode: ModeKind, settings: Settings, };

export type TurnsPage = { data: Array<Turn>, nextCursor: string | null, backwardsCursor: string | null, };

export type ThreadResumeResponse = { thread: Thread, model: string, modelProvider: string, serviceTier: string | null,

disabledPluginIds: Array<string>, cwd: AbsolutePathBuf,

runtimeWorkspaceRoots: Array<AbsolutePathBuf>,

instructionSources: Array<LegacyAppPathString>, approvalPolicy: AskForApproval,

approvalsReviewer: ApprovalsReviewer,

sandbox: SandboxPolicy,

activePermissionProfile: ActivePermissionProfile | null, reasoningEffort: ReasoningEffort | null,

collaborationMode: CollaborationMode | null,

multiAgentMode: MultiAgentMode,

initialTurnsPage: TurnsPage | null,

turnsBackwardsCursor: string | null,

itemsBackwardsCursor: string | null, };

export type ReasoningSummary = "auto" | "concise" | "detailed" | "none";

export type AdditionalContextKind = "untrusted" | "application";

export type AdditionalContextEntry = { value: string, kind: AdditionalContextKind, };

export type TurnToolOutput = { name: string, namespace: string | null, output: FunctionCallOutputBody, };

export type TurnStartParams = { threadId: string,

disabledPluginIds?: Array<string> | null, clientUserMessageId?: string | null, input: Array<UserInput>,

turnTrigger?: string | null, toolOutput?: TurnToolOutput | null,

responsesapiClientMetadata?: { [key in string]?: string } | null,

additionalContext?: { [key in string]?: AdditionalContextEntry } | null,

environments?: Array<TurnEnvironmentParams> | null,

cwd?: string | null,

runtimeWorkspaceRoots?: Array<AbsolutePathBuf> | null,

approvalPolicy?: AskForApproval | null,

approvalsReviewer?: ApprovalsReviewer | null,

sandboxPolicy?: SandboxPolicy | null,

permissions?: string | null,

model?: string | null,

serviceTier?: string | null | null,

serviceTierForTurn?: string | null,

effort?: ReasoningEffort | null,

summary?: ReasoningSummary | null,

personality?: Personality | null,

outputSchema?: JsonValue | null,

collaborationMode?: CollaborationMode | null,

multiAgentMode?: MultiAgentMode | null,

cyberAccessProgram?: CyberAccessProgram | null, };

export type TurnStartResponse = { turn: Turn, };

export type TurnInterruptParams = { threadId: string, turnId: string, };

export type TurnInterruptResponse = Record<string, never>;

export type ItemStartedNotification = { item: ThreadItem, threadId: string, turnId: string,

startedAtMs: number, };

export type ItemCompletedNotification = { item: ThreadItem, threadId: string, turnId: string,

completedAtMs: number, };

export type AgentMessageDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, };

export type ReasoningSummaryTextDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, summaryIndex: number, };

export type ReasoningTextDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, contentIndex: number, };

export type CommandExecutionOutputDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, };

export type TurnStartedNotification = { threadId: string, turn: Turn, };

export type TurnCompletedNotification = { threadId: string, turn: Turn, };

export type TokenUsageBreakdown = { totalTokens: number, inputTokens: number, cachedInputTokens: number, cacheWriteInputTokens: number, outputTokens: number, reasoningOutputTokens: number, };

export type ThreadTokenUsage = { total: TokenUsageBreakdown, last: TokenUsageBreakdown, modelContextWindow: number | null, };

export type ThreadTokenUsageUpdatedNotification = { threadId: string, turnId: string, tokenUsage: ThreadTokenUsage, };

export type FileSystemAccessMode = "read" | "write" | "deny";

export type FileSystemSpecialPath = { "kind": "root" } | { "kind": "minimal" } | { "kind": "project_roots", subpath: LegacyAppPathString | null, } | { "kind": "tmpdir" } | { "kind": "slash_tmp" } | { "kind": "unknown", path: string, subpath: LegacyAppPathString | null, };

export type FileSystemPath = { "type": "path", path: LegacyAppPathString, } | { "type": "glob_pattern", pattern: string, } | { "type": "special", value: FileSystemSpecialPath, };

export type FileSystemSandboxEntry = { path: FileSystemPath, access: FileSystemAccessMode, };

export type AdditionalFileSystemPermissions = {

read: Array<LegacyAppPathString> | null,

write: Array<LegacyAppPathString> | null, globScanMaxDepth?: number, entries?: Array<FileSystemSandboxEntry>, };

export type AdditionalNetworkPermissions = { enabled: boolean | null, };

export type AdditionalPermissionProfile = {

network: AdditionalNetworkPermissions | null, fileSystem: AdditionalFileSystemPermissions | null, };

export type ExecPolicyAmendment = Array<string>;

export type NetworkPolicyRuleAction = "allow" | "deny";

export type NetworkPolicyAmendment = { host: string, action: NetworkPolicyRuleAction, };

export type CommandExecutionApprovalDecision = "accept" | "acceptForSession" | { "acceptWithExecpolicyAmendment": { execpolicy_amendment: ExecPolicyAmendment, } } | { "applyNetworkPolicyAmendment": { network_policy_amendment: NetworkPolicyAmendment, } } | "decline" | "cancel";

export type CommandExecutionApprovalKind = "command" | "writeStdin";

export type NetworkApprovalProtocol = "http" | "https" | "socks5Tcp" | "socks5Udp";

export type NetworkApprovalContext = { host: string, protocol: NetworkApprovalProtocol, };

export type CommandExecutionRequestApprovalParams = {

kind: CommandExecutionApprovalKind, threadId: string, turnId: string, itemId: string,

startedAtMs: number,

approvalId?: string | null,

environmentId: string | null,

reason?: string | null,

networkApprovalContext?: NetworkApprovalContext | null,

command?: string | null,

cwd?: LegacyAppPathString | null,

commandActions?: Array<CommandAction> | null,

additionalPermissions?: AdditionalPermissionProfile | null,

proposedExecpolicyAmendment?: ExecPolicyAmendment | null,

proposedNetworkPolicyAmendments?: Array<NetworkPolicyAmendment> | null,

availableDecisions?: Array<CommandExecutionApprovalDecision> | null, };

export type CommandExecutionRequestApprovalResponse = { decision: CommandExecutionApprovalDecision, };

export type FileChangeRequestApprovalParams = { threadId: string, turnId: string, itemId: string,

startedAtMs: number,

reason?: string | null,

grantRoot?: string | null, };

export type FileChangeApprovalDecision = "accept" | "acceptForSession" | "decline" | "cancel";

export type FileChangeRequestApprovalResponse = { decision: FileChangeApprovalDecision, };

export type ToolRequestUserInputOption = { label: string, description: string, };

export type ToolRequestUserInputQuestion = { id: string, header: string, question: string, isOther: boolean, isSecret: boolean, options: Array<ToolRequestUserInputOption> | null, };

export type ToolRequestUserInputParams = { threadId: string, turnId: string, itemId: string, questions: Array<ToolRequestUserInputQuestion>, isBlocking: boolean,

autoResolutionMs: number | null, };

export type ToolRequestUserInputAnswer = { answers: Array<string>, };

export type ToolRequestUserInputResponse = { answers: { [key in string]?: ToolRequestUserInputAnswer }, };

export type FuzzyFileSearchSessionCompletedNotification = { sessionId: string, };

export type FuzzyFileSearchMatchType = "file" | "directory";

export type FuzzyFileSearchResult = { root: string, path: string, match_type: FuzzyFileSearchMatchType, file_name: string, score: number, indices: Array<number> | null, };

export type FuzzyFileSearchSessionUpdatedNotification = { sessionId: string, query: string, files: Array<FuzzyFileSearchResult>, };

export type DesktopOnboardingEntrypoint = "life_sciences";

export type AccountLoginCompletedNotification = { loginId: string | null, success: boolean, error: string | null, onboardingEntrypoint: DesktopOnboardingEntrypoint | null, };

export type CreditsSnapshot = { hasCredits: boolean, unlimited: boolean, balance: string | null, };

export type RateLimitReachedType = "rate_limit_reached" | "workspace_owner_credits_depleted" | "workspace_member_credits_depleted" | "workspace_owner_usage_limit_reached" | "workspace_member_usage_limit_reached";

export type RateLimitWindow = { usedPercent: number, windowDurationMins: number | null, resetsAt: number | null, };

export type SpendControlLimitSnapshot = { limit: string, used: string, remainingPercent: number, resetsAt: number, };

export type RateLimitSnapshot = { limitId: string | null, limitName: string | null,

normalModelSlug: string | null, primary: RateLimitWindow | null, secondary: RateLimitWindow | null, credits: CreditsSnapshot | null, individualLimit: SpendControlLimitSnapshot | null,

spendControlReached: boolean | null, planType: PlanType | null, rateLimitReachedType: RateLimitReachedType | null, };

export type AccountRateLimitsUpdatedNotification = { rateLimits: RateLimitSnapshot, };

export type AuthMode = "apikey" | "chatgpt" | "chatgptAuthTokens" | "headers" | "agentIdentity" | "personalAccessToken" | "bedrockApiKey" | "bedrockAccessKeys";

export type AccountUpdatedNotification = { authMode: AuthMode | null, planType: PlanType | null, };

export type AppBranding = { category: string | null, developer: string | null, website: string | null, privacyPolicy: string | null, termsOfService: string | null, isDiscoverableApp: boolean, };

export type AppReview = { status: string, };

export type AppScreenshot = { url: string | null, fileId: string | null, userPrompt: string, };

export type AppMetadata = { review: AppReview | null, categories: Array<string> | null, subCategories: Array<string> | null, seoDescription: string | null, screenshots: Array<AppScreenshot> | null, developer: string | null, version: string | null, versionId: string | null, versionNotes: string | null, firstPartyRequiresInstall: boolean | null, showInComposerWhenUnlinked: boolean | null, };

export type AppInfo = { id: string, name: string, description: string | null, logoUrl: string | null, logoUrlDark: string | null, iconAssets: { [key in string]?: string } | null, iconDarkAssets: { [key in string]?: string } | null, distributionChannel: string | null, branding: AppBranding | null, appMetadata: AppMetadata | null, labels: { [key in string]?: string } | null, installUrl: string | null, isAccessible: boolean,

isEnabled: boolean, pluginDisplayNames: Array<string>, };

export type AppListUpdatedNotification = { data: Array<AppInfo>, };

export type AuthRecoveryNotification = { threadId: string, turnId: string, provider: string, message: string, };

export type CommandExecOutputStream = "stdout" | "stderr";

export type CommandExecOutputDeltaNotification = {

processId: string,

stream: CommandExecOutputStream,

deltaBase64: string,

capReached: boolean, };

export type TextPosition = {

line: number,

column: number, };

export type TextRange = { start: TextPosition, end: TextPosition, };

export type ConfigWarningNotification = {

summary: string,

details: string | null,

path?: string,

range?: TextRange, };

export type ContextCompactedNotification = { threadId: string, turnId: string, };

export type DeprecationNoticeNotification = {

summary: string,

details: string | null, };

export type EnvironmentConnectionNotification = { threadId: string, environmentId: string, };

export type ErrorNotification = { error: TurnError, willRetry: boolean, threadId: string, turnId: string, };

export type ExternalAgentConfigMigrationItemType = "AGENTS_MD" | "CONFIG" | "SKILLS" | "PLUGINS" | "MCP_SERVER_CONFIG" | "SUBAGENTS" | "HOOKS" | "COMMANDS" | "MEMORY" | "SESSIONS";

export type ExternalAgentConfigImportItemTypeFailure = { itemType: ExternalAgentConfigMigrationItemType, errorType: string | null, subErrorType: string | null, failureStage: string, message: string, cwd: string | null, source: string | null, };

export type ExternalAgentConfigImportItemTypeSuccess = { itemType: ExternalAgentConfigMigrationItemType, cwd: string | null, source: string | null, target: string | null,

title: string | null, };

export type ExternalAgentConfigImportTypeResult = { itemType: ExternalAgentConfigMigrationItemType, successes: Array<ExternalAgentConfigImportItemTypeSuccess>, failures: Array<ExternalAgentConfigImportItemTypeFailure>, };

export type ExternalAgentConfigImportCompletedNotification = { importId: string, itemTypeResults: Array<ExternalAgentConfigImportTypeResult>, };

export type ExternalAgentConfigImportProgressNotification = { importId: string, itemTypeResults: Array<ExternalAgentConfigImportTypeResult>, };

export type FileChangeOutputDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, };

export type FileChangePatchUpdatedNotification = { threadId: string, turnId: string, itemId: string, changes: Array<FileUpdateChange>, };

export type FsChangedNotification = {

watchId: string,

changedPaths: Array<AbsolutePathBuf>, };

export type GatewayOAuthStatus = "notReady" | "started" | "succeeded" | "failed";

export type GatewayOAuthChangedNotification = {

authUrl: string | null, providerId: string, status: GatewayOAuthStatus, error: string | null, };

export type GuardianWarningNotification = {

threadId: string,

message: string, };

export type HookEventName = "preToolUse" | "permissionRequest" | "postToolUse" | "preCompact" | "postCompact" | "sessionStart" | "sessionEnd" | "userPromptSubmit" | "subagentStart" | "subagentStop" | "stop" | "interrupt";

export type HookExecutionMode = "sync" | "async";

export type HookHandlerType = "command" | "mcpTool" | "prompt" | "agent";

export type HookOutputEntryKind = "warning" | "stop" | "feedback" | "context" | "error";

export type HookOutputEntry = { kind: HookOutputEntryKind, text: string, };

export type HookRunStatus = "running" | "completed" | "failed" | "blocked" | "stopped";

export type HookScope = "thread" | "turn";

export type HookSource = "system" | "user" | "project" | "mdm" | "sessionFlags" | "plugin" | "cloudRequirements" | "cloudManagedConfig" | "legacyManagedConfigFile" | "legacyManagedConfigMdm" | "unknown";

export type HookRunSummary = { id: string, eventName: HookEventName, handlerType: HookHandlerType, executionMode: HookExecutionMode, scope: HookScope, sourcePath: AbsolutePathBuf, source: HookSource, displayOrder: bigint, status: HookRunStatus, statusMessage: string | null, startedAt: bigint, completedAt: bigint | null, durationMs: bigint | null, entries: Array<HookOutputEntry>, };

export type HookCompletedNotification = { threadId: string, turnId: string | null, run: HookRunSummary, };

export type HookStartedNotification = { threadId: string, turnId: string | null, run: HookRunSummary, };

export type AutoReviewDecisionSource = "agent";

export type GuardianApprovalReviewStatus = "inProgress" | "approved" | "denied" | "timedOut" | "aborted";

export type GuardianRiskLevel = "low" | "medium" | "high" | "critical";

export type GuardianUserAuthorization = "unknown" | "low" | "medium" | "high";

export type GuardianApprovalReview = { status: GuardianApprovalReviewStatus, riskLevel: GuardianRiskLevel | null, userAuthorization: GuardianUserAuthorization | null, rationale: string | null, };

export type GuardianCommandSource = "shell" | "unifiedExec";

export type RequestPermissionProfile = { network: AdditionalNetworkPermissions | null, fileSystem: AdditionalFileSystemPermissions | null, };

export type GuardianApprovalReviewAction = { "type": "command", source: GuardianCommandSource, command: string, cwd: LegacyAppPathString, } | { "type": "execve", source: GuardianCommandSource, program: string, argv: Array<string>, cwd: AbsolutePathBuf, } | { "type": "writeStdin", approvalId: string, processId: string, stdin: string, cwd: LegacyAppPathString, } | { "type": "applyPatch", cwd: LegacyAppPathString, files: Array<LegacyAppPathString>, } | { "type": "networkAccess", target: string, host: string, protocol: NetworkApprovalProtocol, port: number, } | { "type": "mcpToolCall", server: string, toolName: string, connectorId: string | null, connectorName: string | null, toolTitle: string | null, } | { "type": "requestPermissions", reason: string | null, permissions: RequestPermissionProfile, };

export type ItemGuardianApprovalReviewCompletedNotification = { threadId: string, turnId: string,

startedAtMs: number,

completedAtMs: number,

reviewId: string,

targetItemId: string | null, decisionSource: AutoReviewDecisionSource, review: GuardianApprovalReview, action: GuardianApprovalReviewAction, };

export type ItemGuardianApprovalReviewStartedNotification = { threadId: string, turnId: string,

startedAtMs: number,

reviewId: string,

targetItemId: string | null, review: GuardianApprovalReview, action: GuardianApprovalReviewAction, };

export type McpServerEventNotification = { method: string, params: JsonValue, };

export type McpServerEventStreamNotification = { subscriptionId: string, notification: McpServerEventNotification, };

export type McpServerOauthLoginCompletedNotification = { name: string, threadId: string | null, success: boolean, error?: string, };

export type McpServerStartupFailureReason = "reauthenticationRequired";

export type McpServerStartupState = "starting" | "ready" | "failed" | "cancelled";

export type McpServerStatusUpdatedNotification = { threadId: string | null, name: string, status: McpServerStartupState, error: string | null, failureReason: McpServerStartupFailureReason | null, };

export type McpToolCallProgressNotification = { threadId: string, turnId: string, itemId: string, message: string, };

export type ModelRerouteReason = "highRiskCyberActivity";

export type ModelReroutedNotification = { threadId: string, turnId: string, fromModel: string, toModel: string, reason: ModelRerouteReason, };

export type ModelSafetyBufferingUpdatedNotification = { threadId: string, turnId: string, model: string, useCases: Array<string>, reasons: Array<string>, showBufferingUi: boolean, fasterModel: string | null, };

export type ModelVerification = "trustedAccessForCyber";

export type ModelVerificationNotification = { threadId: string, turnId: string, verifications: Array<ModelVerification>, };

export type PlanDeltaNotification = { threadId: string, turnId: string, itemId: string, delta: string, };

export type ProcessExitedNotification = {

processHandle: string,

exitCode: number,

stdout: string,

stdoutCapReached: boolean,

stderr: string,

stderrCapReached: boolean, };

export type ProcessOutputStream = "stdout" | "stderr";

export type ProcessOutputDeltaNotification = {

processHandle: string,

stream: ProcessOutputStream,

deltaBase64: string,

capReached: boolean, };

export type ProjectChangeType = "created" | "updated" | "deleted";

export type ProjectChangedNotification = { projectId: string, changeType: ProjectChangeType, };

export type ResponseUsageMetadata = { amount: string | null, metadata: JsonValue | null, };

export type RawResponseCompletedNotification = { threadId: string, turnId: string, responseId: string, usage: TokenUsageBreakdown | null, usageMetadata: ResponseUsageMetadata | null, };

export type RawResponseItemCompletedNotification = { threadId: string, turnId: string, item: ResponseItem, };

export type ReasoningSummaryPartAddedNotification = { threadId: string, turnId: string, itemId: string, summaryIndex: number, };

export type RemoteControlConnectionStatus = "disabled" | "connecting" | "connected" | "errored";

export type RemoteControlStatusChangedNotification = { status: RemoteControlConnectionStatus, serverName: string, installationId: string, environmentId: string | null, };

export type RequestId = string | number;

export type ServerRequestResolvedNotification = { threadId: string, requestId: RequestId, };

export type SkillsChangedNotification = Record<string, never>;

export type StrictReviewRequiredNotification = { threadId: string, turnId: string,

startedAtMs: number, };

export type TerminalInteractionNotification = { threadId: string, turnId: string, itemId: string, processId: string, stdin: string, };

export type ThreadArchivedNotification = { threadId: string, };

export type ThreadAttachmentOperation = "created" | "deleted";

export type ThreadAttachmentUpdatedNotification = { threadId: string, attachmentType: string, identityKey: string, attachmentId: string, operation: ThreadAttachmentOperation, };

export type ThreadClosedNotification = { threadId: string, };

export type ThreadDeletedNotification = { threadId: string, };

export type ThreadGoalClearedNotification = { threadId: string, };

export type ThreadGoalStatus = "active" | "paused" | "blocked" | "usageLimited" | "budgetLimited" | "complete";

export type ThreadGoal = { threadId: string, objective: string, status: ThreadGoalStatus, tokenBudget: number | null, tokensUsed: number, timeUsedSeconds: number, createdAt: number, updatedAt: number, };

export type ThreadGoalUpdatedNotification = { threadId: string, turnId: string | null, goal: ThreadGoal, };

export type ThreadNameUpdatedNotification = { threadId: string, threadName?: string, };

export type ThreadProjectUpdatedNotification = { threadId: string, projectId: string | null, };

export type ThreadQueueChangedNotification = { threadId: string, };

export type ThreadRealtimeClosedNotification = { threadId: string, reason: string | null, };

export type ThreadRealtimeErrorNotification = { threadId: string, message: string, };

export type ThreadRealtimeItemAddedNotification = { threadId: string, item: JsonValue, };

export type ThreadRealtimeBemItemPresentation = { "type": "wholeItem" } | { "type": "inlineMarkdown" } | { "type": "inlineVisualization", index: number, };

export type ThreadRealtimeSessionOutcome = "ended" | "failed";

export type ThreadRealtimeTranscriptRole = "user" | "assistant";

export type ThreadRealtimeItem = { id: string, realtimeSessionId: string, } & ({ "type": "realtimeSessionStarted" } | { "type": "transcriptSegment", role: ThreadRealtimeTranscriptRole, text: string, } | { "type": "bemItemPromoted", turnId: string, itemId: string, presentation: ThreadRealtimeBemItemPresentation, } | { "type": "realtimeSessionClosed", outcome: ThreadRealtimeSessionOutcome, });

export type ThreadRealtimeItemCompletedNotification = { threadId: string, item: ThreadRealtimeItem, };

export type ThreadRealtimeItemStartedNotification = { threadId: string, item: ThreadRealtimeItem, };

export type ThreadRealtimeItemTranscriptDeltaNotification = { threadId: string, itemId: string, delta: string, };

export type ThreadRealtimeAudioChunk = { data: string, sampleRate: number, numChannels: number, samplesPerChannel: number | null, itemId: string | null, };

export type ThreadRealtimeOutputAudioDeltaNotification = { threadId: string, audio: ThreadRealtimeAudioChunk, };

export type ThreadRealtimeSdpNotification = { threadId: string, sdp: string, };

export type RealtimeConversationVersion = "v1" | "v2" | "v3";

export type ThreadRealtimeStartedNotification = { threadId: string, realtimeSessionId: string | null, version: RealtimeConversationVersion, };

export type ThreadRealtimeTranscriptDeltaNotification = { threadId: string, role: string,

delta: string, };

export type ThreadRealtimeTranscriptDoneNotification = { threadId: string, role: string,

text: string, };

export type ThreadRevertedNotification = { threadId: string, };

export type ThreadSettings = {

disabledPluginIds: Array<string>, cwd: AbsolutePathBuf, approvalPolicy: AskForApproval, approvalsReviewer: ApprovalsReviewer, sandboxPolicy: SandboxPolicy, activePermissionProfile: ActivePermissionProfile | null, model: string, modelProvider: string, serviceTier: string | null, effort: ReasoningEffort | null, summary: ReasoningSummary | null, collaborationMode: CollaborationMode,

multiAgentMode: MultiAgentMode,

personality: Personality | null, };

export type ThreadSettingsUpdatedNotification = { threadId: string, threadSettings: ThreadSettings, };

export type ThreadStartedNotification = { thread: Thread, };

export type ThreadStatusChangedNotification = { threadId: string, status: ThreadStatus, };

export type ThreadUnarchivedNotification = { threadId: string, };

export type TurnDiffUpdatedNotification = { threadId: string, turnId: string, diff: string, };

export type TurnModerationMetadataNotification = { threadId: string, turnId: string, metadata: JsonValue, };

export type TurnPlanStepStatus = "pending" | "inProgress" | "completed";

export type TurnPlanStep = { step: string, status: TurnPlanStepStatus, };

export type TurnPlanUpdatedNotification = { threadId: string, turnId: string, explanation: string | null, plan: Array<TurnPlanStep>, };

export type WarningNotification = {

threadId: string | null,

message: string, };

export type WindowsSandboxSetupMode = "elevated" | "unelevated";

export type WindowsSandboxSetupCompletedNotification = { mode: WindowsSandboxSetupMode, success: boolean, error: string | null, };

export type WindowsWorldWritableWarningNotification = { samplePaths: Array<string>, extraCount: number, failedScan: boolean, };

export type ServerNotification = { "method": "error", "params": ErrorNotification } | { "method": "thread/started", "params": ThreadStartedNotification } | { "method": "thread/status/changed", "params": ThreadStatusChangedNotification } | { "method": "thread/archived", "params": ThreadArchivedNotification } | { "method": "thread/deleted", "params": ThreadDeletedNotification } | { "method": "thread/unarchived", "params": ThreadUnarchivedNotification } | { "method": "thread/closed", "params": ThreadClosedNotification } | { "method": "thread/reverted", "params": ThreadRevertedNotification } | { "method": "skills/changed", "params": SkillsChangedNotification } | { "method": "thread/name/updated", "params": ThreadNameUpdatedNotification } | { "method": "thread/attachment/updated", "params": ThreadAttachmentUpdatedNotification } | { "method": "thread/goal/updated", "params": ThreadGoalUpdatedNotification } | { "method": "thread/goal/cleared", "params": ThreadGoalClearedNotification } | { "method": "thread/queue/changed", "params": ThreadQueueChangedNotification } | { "method": "project/changed", "params": ProjectChangedNotification } | { "method": "thread/project/updated", "params": ThreadProjectUpdatedNotification } | { "method": "thread/environment/connected", "params": EnvironmentConnectionNotification } | { "method": "thread/environment/disconnected", "params": EnvironmentConnectionNotification } | { "method": "thread/settings/updated", "params": ThreadSettingsUpdatedNotification } | { "method": "thread/tokenUsage/updated", "params": ThreadTokenUsageUpdatedNotification } | { "method": "turn/started", "params": TurnStartedNotification } | { "method": "hook/started", "params": HookStartedNotification } | { "method": "turn/completed", "params": TurnCompletedNotification } | { "method": "hook/completed", "params": HookCompletedNotification } | { "method": "turn/diff/updated", "params": TurnDiffUpdatedNotification } | { "method": "turn/plan/updated", "params": TurnPlanUpdatedNotification } | { "method": "item/started", "params": ItemStartedNotification } | { "method": "item/autoApprovalReview/started", "params": ItemGuardianApprovalReviewStartedNotification } | { "method": "item/autoApprovalReview/completed", "params": ItemGuardianApprovalReviewCompletedNotification } | { "method": "autoApprovalReview/strictReviewRequired", "params": StrictReviewRequiredNotification } | { "method": "item/completed", "params": ItemCompletedNotification } | { "method": "rawResponseItem/completed", "params": RawResponseItemCompletedNotification } | { "method": "rawResponse/completed", "params": RawResponseCompletedNotification } | { "method": "item/agentMessage/delta", "params": AgentMessageDeltaNotification } | { "method": "item/plan/delta", "params": PlanDeltaNotification } | { "method": "command/exec/outputDelta", "params": CommandExecOutputDeltaNotification } | { "method": "process/outputDelta", "params": ProcessOutputDeltaNotification } | { "method": "process/exited", "params": ProcessExitedNotification } | { "method": "item/commandExecution/outputDelta", "params": CommandExecutionOutputDeltaNotification } | { "method": "item/commandExecution/terminalInteraction", "params": TerminalInteractionNotification } | { "method": "item/fileChange/outputDelta", "params": FileChangeOutputDeltaNotification } | { "method": "item/fileChange/patchUpdated", "params": FileChangePatchUpdatedNotification } | { "method": "serverRequest/resolved", "params": ServerRequestResolvedNotification } | { "method": "item/mcpToolCall/progress", "params": McpToolCallProgressNotification } | { "method": "mcpServer/oauthLogin/completed", "params": McpServerOauthLoginCompletedNotification } | { "method": "mcpServer/startupStatus/updated", "params": McpServerStatusUpdatedNotification } | { "method": "mcpServer/event/stream/notification", "params": McpServerEventStreamNotification } | { "method": "account/updated", "params": AccountUpdatedNotification } | { "method": "account/gatewayOAuth/changed", "params": GatewayOAuthChangedNotification } | { "method": "account/rateLimits/updated", "params": AccountRateLimitsUpdatedNotification } | { "method": "app/list/updated", "params": AppListUpdatedNotification } | { "method": "remoteControl/status/changed", "params": RemoteControlStatusChangedNotification } | { "method": "externalAgentConfig/import/progress", "params": ExternalAgentConfigImportProgressNotification } | { "method": "externalAgentConfig/import/completed", "params": ExternalAgentConfigImportCompletedNotification } | { "method": "fs/changed", "params": FsChangedNotification } | { "method": "item/reasoning/summaryTextDelta", "params": ReasoningSummaryTextDeltaNotification } | { "method": "item/reasoning/summaryPartAdded", "params": ReasoningSummaryPartAddedNotification } | { "method": "item/reasoning/textDelta", "params": ReasoningTextDeltaNotification } | { "method": "thread/compacted", "params": ContextCompactedNotification } | { "method": "model/rerouted", "params": ModelReroutedNotification } | { "method": "model/verification", "params": ModelVerificationNotification } | { "method": "modelProvider/authRecoveryStarted", "params": AuthRecoveryNotification } | { "method": "modelProvider/authRecoveryCompleted", "params": AuthRecoveryNotification } | { "method": "turn/moderationMetadata", "params": TurnModerationMetadataNotification } | { "method": "model/safetyBuffering/updated", "params": ModelSafetyBufferingUpdatedNotification } | { "method": "warning", "params": WarningNotification } | { "method": "guardianWarning", "params": GuardianWarningNotification } | { "method": "deprecationNotice", "params": DeprecationNoticeNotification } | { "method": "configWarning", "params": ConfigWarningNotification } | { "method": "fuzzyFileSearch/sessionUpdated", "params": FuzzyFileSearchSessionUpdatedNotification } | { "method": "fuzzyFileSearch/sessionCompleted", "params": FuzzyFileSearchSessionCompletedNotification } | { "method": "thread/realtime/started", "params": ThreadRealtimeStartedNotification } | { "method": "thread/realtime/itemAdded", "params": ThreadRealtimeItemAddedNotification } | { "method": "thread/realtime/item/started", "params": ThreadRealtimeItemStartedNotification } | { "method": "thread/realtime/item/transcript/delta", "params": ThreadRealtimeItemTranscriptDeltaNotification } | { "method": "thread/realtime/item/completed", "params": ThreadRealtimeItemCompletedNotification } | { "method": "thread/realtime/transcript/delta", "params": ThreadRealtimeTranscriptDeltaNotification } | { "method": "thread/realtime/transcript/done", "params": ThreadRealtimeTranscriptDoneNotification } | { "method": "thread/realtime/outputAudio/delta", "params": ThreadRealtimeOutputAudioDeltaNotification } | { "method": "thread/realtime/sdp", "params": ThreadRealtimeSdpNotification } | { "method": "thread/realtime/error", "params": ThreadRealtimeErrorNotification } | { "method": "thread/realtime/closed", "params": ThreadRealtimeClosedNotification } | { "method": "windows/worldWritableWarning", "params": WindowsWorldWritableWarningNotification } | { "method": "windowsSandbox/setupCompleted", "params": WindowsSandboxSetupCompletedNotification } | { "method": "account/login/completed", "params": AccountLoginCompletedNotification };
