// Generated from codex-cli 0.157.0; run node packages/agents/codex/generate-protocol.ts.

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

export type FileChangeRequestApprovalParams = { threadId: string, turnId: string, itemId: string,

startedAtMs: number,

reason?: string | null,

grantRoot?: string | null, };

export type ToolRequestUserInputOption = { label: string, description: string, };

export type ToolRequestUserInputQuestion = { id: string, header: string, question: string, isOther: boolean, isSecret: boolean, options: Array<ToolRequestUserInputOption> | null, };

export type ToolRequestUserInputParams = { threadId: string, turnId: string, itemId: string, questions: Array<ToolRequestUserInputQuestion>, isBlocking: boolean,

autoResolutionMs: number | null, };
