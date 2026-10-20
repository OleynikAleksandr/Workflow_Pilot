"""ChatGPT UI tools routed to the running Workflow Pilot backend (the Control owner)."""
import asyncio
import http.client
import json
import re
from hashlib import sha256
from pathlib import Path
from typing import Annotated, Any, Literal
from uuid import uuid4

from mcp.server.fastmcp import Context
from mcp.types import CallToolResult, TextContent, ToolAnnotations
from pydantic import BaseModel, ConfigDict, Field

LEGACY_UI_URI = "ui://workflow-pilot/projects-v1.html"


def load_panel_resource(file: Path) -> tuple[str, str]:
    # The URI is a host cache key. Keep its bytes immutable for this MCP instance,
    # even while an updater replaces the source files for the next instance.
    html = file.read_bytes().decode("utf-8")
    return "ui://workflow-pilot/panel-" + sha256(html.encode("utf-8")).hexdigest() + ".html", html


LEGACY_PANEL_HTML = """<!doctype html><html lang="ru"><meta charset="utf-8">
<title>Обновите панель Workflow Pilot</title><body>
<h1>Эта ссылка ведёт к прежней панели Workflow Pilot</h1>
<p>Обновите инструменты подключения Workflow Pilot в ChatGPT, затем попросите
агента заново вызвать workflow_pilot_panel в этом разговоре.</p>
<p>Переустановка приложения сама по себе не заменяет сохранённую панель ChatGPT.
Идентификаторы участников копировать и отдельно включать связь не нужно.</p>
</body></html>"""
READ = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)
CONNECT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)
LAUNCH = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)

RunId = Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$", description="Exact identifier of the communication experiment run.")]
ParticipantId = Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Participant returned by join; identity is verified against host metadata, never against this id alone.")]
MessageId = Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact message or delivery attempt identifier returned by this server.")]


class CommunicationBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: RunId
    participant_id: ParticipantId
    panel_instance_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Fresh id for this mounted panel; never restored after reload.")]
    protocol_version: Annotated[int, Field(description="Protocol implemented by the staged panel.")]
    build_id: Annotated[str, Field(max_length=128, description="Exact build of the staged panel.")]
    permission_generation: Annotated[int | None, Field(ge=0, description="Generation returned by enable; required before delivery.")] = None


Binding = Annotated[CommunicationBinding, Field(description="Panel binding and permission; host metadata is obtained separately for every call.")]


class AssignmentContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Annotated[str, Field(min_length=1, max_length=1024, description="Source selected and read by the orchestrator; a label or exact document reference.")]
    text: Annotated[str, Field(min_length=1, max_length=1048576, description="Complete selected text; never silently truncate. Total body and contexts are limited to 1 MiB UTF-8.")]
    commit: Annotated[str | None, Field(pattern=r"^(?:[a-f0-9]{40}|[a-f0-9]{64})$", description="Source revision when applicable.")] = None


class CommunicationEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: MessageId
    event_type: Annotated[str, Field(pattern=r"^(sdk\.(invoked|accepted|rejected|timeout|error)|report\.failed|stop\.(local|failed)|host\.(handshake|context_changed)|visibility\.changed|panel\.(pagehide|dispose|mount|resume)|wait\.error|connection\.restored|rpc\.completed)$")]
    client_sequence: Annotated[int, Field(ge=1)]
    client_time: Annotated[str, Field(max_length=40)]
    duration_ms: Annotated[float, Field(ge=0, le=86400000)]
    message_id: MessageId | None = None
    error_code: Annotated[str | None, Field(max_length=80)] = None
    message_supported: bool | None = None
    operation: Annotated[str | None, Field(max_length=32)] = None
    operation_ms: Annotated[float | None, Field(ge=0, le=86400000)] = None


def host_metadata(ctx: Context) -> dict[str, str]:
    meta = ctx.request_context.meta
    values = meta.model_dump(by_alias=True) if meta else {}
    return {key: values[key] for key in ("openai/session", "openai/subject", "openai/organization")
            if isinstance(values.get(key), str) and len(values[key]) <= 512}


class PluginBridge:
    def __init__(self, state_root: Path):
        self.descriptor = state_root / "plugin-bridge.json"

    def call(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            if self.descriptor.is_symlink() or self.descriptor.stat().st_size > 2048:
                raise ValueError("Invalid descriptor")
            state = json.loads(self.descriptor.read_text(encoding="utf-8"))
            if (state.get("version") != 1 or type(state.get("port")) is not int
                    or not 1 <= state["port"] <= 65535
                    or not re.fullmatch(r"[a-f0-9]{64}", state.get("token", ""))):
                raise ValueError("Invalid descriptor")
        except (OSError, ValueError, TypeError):
            return {"error": {"code": "PLUGIN_DESKTOP_REQUIRED", "message": "Фоновая служба Workflow Pilot не запущена. Откройте Workflow Pilot (после закрытия окна служба продолжит работу) и повторите действие."}}
        connection = http.client.HTTPConnection("127.0.0.1", state["port"], timeout=120)
        try:
            connection.request("POST", "/plugin", json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                               {"Authorization": "Bearer " + state["token"], "Content-Type": "application/json"})
            response = connection.getresponse()
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise ValueError("Response too large")
            result = json.loads(body)
            if not isinstance(result, dict):
                raise ValueError("Invalid response")
            if response.status != 200 and "error" not in result:
                raise ValueError("Bridge rejected request")
            return result
        except (OSError, ValueError, http.client.HTTPException):
            return {"error": {"code": "PLUGIN_DESKTOP_UNAVAILABLE", "message": "Фоновая служба Workflow Pilot недоступна. Откройте Workflow Pilot, чтобы перезапустить её, и повторите действие."}}
        finally:
            connection.close()


def result(data: dict[str, Any]) -> CallToolResult:
    error = data.get("error")
    if error:
        return CallToolResult(isError=True, content=[TextContent(type="text", text=error["message"])], structuredContent=data)
    context = data.get("context")
    summary = {key: value for key, value in data.items() if key != "context"}
    blocks = [TextContent(type="text", text=json.dumps(summary, ensure_ascii=False))]
    if context:
        blocks.append(TextContent(type="text", text=context))
    return CallToolResult(content=blocks, structuredContent=summary)


def register_plugin(mcp, state_root: Path):
    bridge = PluginBridge(state_root)
    ui_uri, panel_html = load_panel_resource(Path(__file__).parent / "plugin-ui.html")
    ui = {"resourceUri": ui_uri}

    async def communication(action, ctx, **args):
        binding = args.pop("binding", None)
        if binding is not None:
            args.update(binding.model_dump())
        data = await asyncio.to_thread(bridge.call, {**args, "action": "communication." + action,
                                                   "metadata": host_metadata(ctx)})
        # Catalogue URI belongs to this immutable MCP snapshot, not to a replayed iframe.
        return result({**data, "panel_resource_uri": ui_uri})

    @mcp.tool(name="workflow_communication_join", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def join(run_id: RunId, role: Annotated[str, Field(pattern=r"^(O|E)$", description="Role O or E; two different conversations are required.")], ctx: Context) -> CallToolResult:
        """Legacy experiment only: join an O/E run. Working plans reject join and register automatically through workflow_pilot_panel with their bootstrap invitation. No delivery or model turn is started."""
        return await communication("join", ctx, run_id=run_id, role=role)

    @mcp.tool(name="workflow_communication_send_message", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def send_message(run_id: RunId, participant_id: ParticipantId, recipient_id: ParticipantId,
                           kind: Annotated[str, Field(pattern=r"^(question|answer|result)$", description="Finite exchange: question, answer or final result.")],
                           body: Annotated[str, Field(min_length=1, max_length=4096, description="Experiment text, at most 4096 UTF-8 bytes; never secrets.")],
                           idempotency_key: RunId, ctx: Context,
                           in_reply_to: Annotated[str | None, Field(max_length=128, description="Received message id; required for answer/result.")] = None) -> CallToolResult:
        """Legacy experiment only. Working plans reject this tool. For dialogue version 1 use workflow_assignment_send for task/context/questions/results and workflow_assignment_yield after handling incoming messages. Older assignments retain canonical Kit task:block/assignment:message until safe migration. Same key/content returns the same message. Queue acceptance is not SDK acceptance or reading. Never call app-only wait."""
        return await communication("send", ctx, run_id=run_id, participant_id=participant_id, recipient_id=recipient_id,
                                   kind=kind, body=body, idempotency_key=idempotency_key, in_reply_to=in_reply_to)

    @mcp.tool(name="workflow_communication_read_message", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def read_message(message_id: MessageId, ctx: Context,
                           run_id: Annotated[str | None, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$", description="Legacy run only; omit for automatically registered working plans.")] = None,
                           participant_id: Annotated[str | None, Field(max_length=128, description="Legacy participant only; working plans derive it from host identity.")] = None) -> CallToolResult:
        """Read an addressed message, current role instructions and record receipt. Small service messages include complete inline_context with digest and recipient_ref: use them directly without another context/participants read. Otherwise read all referenced context parts. Apply the role update without replaying completed work. A superseded signal must not execute. Identity must match the recipient. This mutation never notifies or returns UI."""
        return await communication("readMessage", ctx, run_id=run_id, participant_id=participant_id, message_id=message_id)

    @mcp.tool(name="workflow_communication_read_context", annotations=READ, meta={"ui": {"visibility": ["model"]}})
    async def read_context(message_id: MessageId, context_ref: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$", description="Opaque context reference returned by read_message.")], ctx: Context,
                           part: Annotated[int, Field(ge=0, description="Zero-based part; read through total-1.")] = 0) -> CallToolResult:
        """Read the complete working instruction in numbered UTF-8 parts. Read zero through total-1 before acting; no truncation. Fresh identity, current assignment and block correlation must match. STALE_MESSAGE means do not execute the old decision. No UI or model turn is created."""
        return await communication("content", ctx, message_id=message_id, context_ref=context_ref, part=part)

    @mcp.tool(name="workflow_communication_participants", annotations=READ, meta={"ui": {"visibility": ["model"]}})
    async def participants(ctx: Context) -> CallToolResult:
        """Read current plan participants and assignment recipient_ref/attempt from verified host identity. O sees its executors; E addresses orchestrator. block is Kit state; parked requires a current stopped page and idle local commands. Check parked for every affected E before shared environment repair; otherwise yield and await service recovery. No copied IDs. Legacy capability errors require safe migration."""
        return await communication("roster", ctx)

    @mcp.tool(name="workflow_assignment_send", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def assignment_send(
            recipient: Annotated[str, Field(min_length=1, max_length=240, description="O uses recipient_ref from participants; E uses orchestrator.")],
            kind: Annotated[str, Field(pattern=r"^(task|context_request|context|question|clarification|decision|result|revision_request|acceptance)$", description="Semantic message type; Kit checks the author's role and state transition.")],
            body: Annotated[str, Field(min_length=1, max_length=1048576, description="Agent-authored task, question, decision or report. No automatic project-context expansion.")],
            attempt: Annotated[int, Field(ge=1, description="Current assignment attempt returned by participants/status.")],
            idempotency_key: Annotated[str, Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$", description="Stable key for this operation. Retry the same content with the same key.")],
            ctx: Context,
            contexts: Annotated[list[AssignmentContext] | None, Field(max_length=16, description="Selected immutable context sources, not the entire project recovery.")] = None,
            in_reply_to: Annotated[MessageId | None, Field(description="Read incoming message this responds to.")] = None,
            source_commit: Annotated[str | None, Field(pattern=r"^(?:[a-f0-9]{40}|[a-f0-9]{64})$", description="Exact checked SHA for result, acceptance or revision_request.")] = None,
            result_id: Annotated[MessageId | None, Field(description="Read result being accepted or returned for revision.")] = None,
            block_id: Annotated[str | None, Field(max_length=240, description="Existing blocking question correlation returned by Kit.")] = None,
            problem_id: Annotated[str | None, Field(max_length=240, description="Stable problem identity across repair attempts.")] = None,
            blocking: Annotated[bool, Field(description="True when this question prevents safe work on the assignment.")] = False,
            resume: Annotated[bool, Field(description="Explicit O decision to resume the current correlated block.")] = False) -> CallToolResult:
        """Working O/E dialogue. Author is verified from host identity. O selects only needed context and issues task; E asks O for missing context/problems and sends result after checked commit. O reads result, accepts its exact SHA or requests revision, then integrates through Kit. Outgoing messages are allowed during the current turn. A durable intent precedes Kit effects and delivery; same key/content never duplicates an effect. Acceptance is not integration. Do not duplicate this operation with legacy send or task:block. After processing incoming messages call workflow_assignment_yield and finish the turn."""
        return await communication("assignmentSend", ctx, recipient=recipient, kind=kind, body=body, attempt=attempt,
                                   idempotency_key=idempotency_key, contexts=[c.model_dump() for c in contexts or []],
                                   in_reply_to=in_reply_to, source_commit=source_commit, result_id=result_id,
                                   block_id=block_id, problem_id=problem_id, blocking=blocking, resume=resume)

    @mcp.tool(name="workflow_assignment_prepare", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def assignment_prepare(recipient: RunId, attempt: Annotated[int, Field(ge=1, description="Current assignment attempt from participants.")],
                                 body: Annotated[str, Field(min_length=1, max_length=1048576, description="Orchestrator-authored task text; no secrets.")],
                                 idempotency_key: RunId, ctx: Context,
                                 contexts: Annotated[list[AssignmentContext] | None, Field(max_length=16, description="Selected context sources for this executor only.")] = None,
                                 dispatch_when_ready: Annotated[bool, Field(description="Explicitly authorize this exact task/context to dispatch when its channel is ready in the current plan generation. False saves a draft only.")] = False) -> CallToolResult:
        """Orchestrator only: reuse the planning task_brief from service read_message/status, verify current facts and prepare the final task/context concurrently with bootstrap using recipient_ref and attempt. Explicitly read other preparation_queue messages and prepare available independent assignments in the same turn; yield all handled IDs together, without waiting for the whole wave. Prefer dispatch_when_ready=true: explicitly authorizes delivery now if ready, otherwise durably without another O turn. Pause/restart requires reauthorization. False saves only a draft. Same key/content never repeats a Kit effect. Read complete inline context directly; do not reread or poll readiness."""
        return await communication("assignmentPrepare", ctx, recipient=recipient, attempt=attempt, body=body,
                                   idempotency_key=idempotency_key, contexts=[c.model_dump() for c in contexts or []],
                                   dispatch_when_ready=dispatch_when_ready)

    @mcp.tool(name="workflow_assignment_dispatch", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def assignment_dispatch(draft_id: MessageId, ctx: Context,
                                  when_ready: Annotated[bool, Field(description="Explicitly authorize delivery when ready in this generation; use for reauthorization after pause/restart.")] = False) -> CallToolResult:
        """Orchestrator explicitly authorizes its saved exact task. Validates assignment, attempt and requirements again. when_ready=true persists authorization until ready without another model turn; false requires current binding, SDK and physical bootstrap completion now. Pause/restart invalidates unconsumed authorization. Repeated calls return the same receipt, never repeat UNKNOWN."""
        return await communication("assignmentDispatch", ctx, draft_id=draft_id, when_ready=when_ready)

    @mcp.tool(name="workflow_assignment_yield", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def assignment_yield(message_ids: Annotated[list[MessageId], Field(min_length=1, max_length=32, description="Read incoming messages processed during this turn.")],
                               reason: Annotated[Literal["awaiting_reply", "tasks_sent", "result_sent", "handled"], Field(description="awaiting_reply: waiting (including channel ready); tasks_sent: tasks sent; result_sent: result sent; handled: other processing. Never task completion proof.")], ctx: Context) -> CallToolResult:
        """Acknowledge processing of read incoming messages, then finish the turn. This is not DONE, acceptance or proof that generation stopped. Backend additionally observes physical completion before another SDK wakeup. No model polling or user Continue is needed for an ordinary reply."""
        return await communication("assignmentYield", ctx, message_ids=message_ids, reason=reason)

    @mcp.tool(name="workflow_assignment_status", annotations=READ, meta={"ui": {"visibility": ["model"]}})
    async def assignment_status(ctx: Context) -> CallToolResult:
        """Read assignment attempt, grants, result/acceptance, pending intents and message receipts for this verified identity. Does not send or wake an agent. Read/handled and Kit integration are different facts. Never poll this with repeated model turns."""
        return await communication("assignmentStatus", ctx)

    @mcp.tool(name="workflow_assignment_migrate", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def assignment_migrate(ctx: Context) -> CallToolResult:
        """Explicitly migrate this orchestrator's old 0.5.7 assignments after the user requests a transition and pauses the plan. Requires parked executors and resolved deliveries. Installer upgrades pinned runtimes and preserves checked commits; READY executors must report their existing result without repeating work. No automatic restart: one common Continue resumes. Busy or UNKNOWN is a concrete refusal; never clear receipts or use DOM fallback."""
        return await communication("assignmentMigrate", ctx)

    @mcp.tool(name="workflow_communication_probe", annotations=LAUNCH, meta={"ui": {"visibility": ["model"]}})
    async def probe(run_id: RunId, participant_id: ParticipantId,
                    delay_ms: Annotated[int, Field(ge=25, le=60000, description="One-shot delay in milliseconds. Enable the panel first, then end your turn.")], ctx: Context) -> CallToolResult:
        """Legacy experiment only: schedule one control message for an explicitly enabled panel. Working plans reject probe. Stop cancels it; no active-model wait. A fixture does not prove ChatGPT wakeup."""
        return await communication("probe", ctx, run_id=run_id, participant_id=participant_id, delay_ms=delay_ms)

    @mcp.tool(name="workflow_communication_status", annotations=READ, meta={"ui": {"visibility": ["app", "model"]}})
    async def status(run_id: RunId, participant_id: ParticipantId, ctx: Context,
                     view: Annotated[Literal["full", "panel"], Field(description="full verifies the Kit roster; panel returns lightweight channel facts for background UI refresh. Neither grants permission.")] = "full") -> CallToolResult:
        """Read this participant's communication state without launching a model or returning UI."""
        return await communication("status", ctx, run_id=run_id, participant_id=participant_id, view=view)

    @mcp.tool(name="workflow_communication_journal", annotations=READ, meta={"ui": {"visibility": ["app", "model"]}})
    async def journal(run_id: RunId, participant_id: ParticipantId, ctx: Context,
                      after_seq: Annotated[int, Field(ge=0, description="Last sequence received; returns up to 100 events.")] = 0) -> CallToolResult:
        """Read the run's ordered diagnostic events after verifying membership. No raw host metadata or transport credentials are returned."""
        return await communication("journal", ctx, run_id=run_id, participant_id=participant_id, after_seq=after_seq)

    @mcp.tool(name="workflow_communication_export", annotations=READ, meta={"ui": {"visibility": ["app", "model"]}})
    async def export(run_id: RunId, participant_id: ParticipantId, ctx: Context,
                     after_seq: Annotated[int, Field(ge=0, description="Last exported sequence; pages contain up to 100 events.")] = 0,
                     through_seq: Annotated[int | None, Field(ge=0, description="Freeze at the first response's through_seq until complete.")] = None) -> CallToolResult:
        """Export only this joined run as UTF-8 JSONL pages and a summary. No arbitrary filesystem path, raw host metadata or credentials. Preserve through_seq between pages."""
        args = {"run_id": run_id, "participant_id": participant_id, "after_seq": after_seq}
        if through_seq is not None:
            args["through_seq"] = through_seq
        return await communication("export", ctx, **args)

    @mcp.tool(name="workflow_communication_telemetry", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def telemetry(binding: Binding, event: Annotated[CommunicationEvent, Field(description="One sanitized panel event; fixed event types and monotonic client sequence.")], ctx: Context) -> CallToolResult:
        """App-only record a bounded diagnostic event. Event IDs deduplicate retries and sequence gaps remain visible. Never include raw SDK responses, credentials or arbitrary errors."""
        return await communication("telemetry", ctx, binding=binding, event=event.model_dump(exclude_none=True))

    @mcp.tool(name="workflow_communication_telemetry_batch", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def telemetry_batch(binding: Binding, events: Annotated[list[CommunicationEvent], Field(min_length=1, max_length=16, description="One to sixteen ordered sanitized events from the same bound panel; retries retain event IDs.")], ctx: Context) -> CallToolResult:
        """App-only bounded ordered diagnostic batch. Duplicate event IDs are idempotent; no delivery or scheduler wake. duration_ms is time since panel mount, operation_ms is measured operation duration on that panel clock."""
        return await communication("telemetryBatch", ctx, binding=binding, events=[event.model_dump(exclude_none=True) for event in events])

    @mcp.tool(name="workflow_communication_bind", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def bind(binding: Binding, ctx: Context, message_supported: Annotated[bool, Field(description="True only when the connected SDK exposes openai/message.")] = False) -> CallToolResult:
        """App-only compare fresh host identity with this session's registration and report SDK readiness. Does not grant plan permission. Rebind each new instance; a historical tool result is not authorization."""
        return await communication("bind", ctx, binding=binding, message_supported=message_supported)

    @mcp.tool(name="workflow_communication_recover", annotations=READ, meta={"ui": {"visibility": ["app"]}})
    async def recover(ctx: Context) -> CallToolResult:
        """App-only discover current assignment from fresh host identity. Automatically bind the sole workflow participant; never ask for copied IDs. Legacy experiments alone may select a run and require Enable. This read never grants permission."""
        return await communication("recover", ctx)

    @mcp.tool(name="workflow_communication_sync", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def sync(binding: Binding, message_supported: Annotated[bool, Field(description="True only while the current SDK exposes openai/message.")], ctx: Context) -> CallToolResult:
        """App-only renew SDK presence and read existing plan permission. Never grants permission: Start/Continue controls it. No model turn, no thirty-minute limit on an active plan."""
        return await communication("sync", ctx, binding=binding, message_supported=message_supported)

    @mcp.tool(name="workflow_communication_enable", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def enable(binding: Binding, message_supported: Annotated[bool, Field(description="The real SDK exposes experimental openai/message on this host.")], ctx: Context) -> CallToolResult:
        """App-only legacy experiment permission for thirty minutes. Working plans reject Enable: Start/Continue grants plan permission and sync only renews SDK presence. Legacy reload requires a new explicit Enable."""
        return await communication("enable", ctx, binding=binding, message_supported=message_supported)

    @mcp.tool(name="workflow_communication_stop", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def stop(binding: Binding, ctx: Context,
                   scope: Annotated[str, Field(pattern=r"^(participant|panel)$", description="participant for explicit user Stop (whole working plan, one legacy participant); panel for lifecycle detach.")] = "participant") -> CallToolResult:
        """App-only Stop. In a working plan, explicit participant scope revokes sending for the whole plan; panel scope only detaches this SDK instance. In legacy experiments, participant scope stops one participant and panel scope is fenced by permission_generation. Repeated calls are idempotent. Already handed-off requests cannot be cancelled."""
        return await communication("stop", ctx, binding=binding, scope=scope)

    @mcp.tool(name="workflow_communication_wait", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def wait(binding: Binding, after_seq: Annotated[int, Field(ge=0, description="Last event sequence seen by this panel; one outstanding wait per instance.")], ctx: Context) -> CallToolResult:
        """App-only long poll, up to 25 seconds; timeout may be repeated. Carries events and one pending delivery. Never call from a model turn."""
        return await communication("wait", ctx, binding=binding, after_seq=after_seq)

    @mcp.tool(name="workflow_communication_claim", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def claim(binding: Binding, message_id: MessageId, ctx: Context) -> CallToolResult:
        """App-only consume-once delivery claim. A lost claim result is never retried or returned to pending. Requires current permission and fresh matching host metadata."""
        return await communication("claim", ctx, binding=binding, message_id=message_id)

    @mcp.tool(name="workflow_communication_claim_ready", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def claim_ready(binding: Binding, message_id: MessageId, ctx: Context) -> CallToolResult:
        """App-only atomic consume-once claim and final identity/permission/admission check, with durable one-shot send intent. Call SDK immediately after a valid response. Lost/unknown response must never be retried. Legacy claim and verify remain available."""
        return await communication("claimReady", ctx, binding=binding, message_id=message_id)

    @mcp.tool(name="workflow_communication_verify", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def verify(binding: Binding, message_id: MessageId, delivery_attempt_id: MessageId, ctx: Context) -> CallToolResult:
        """App-only final identity/permission check and one-shot send intent immediately before SDK target:active/send:true. Missing or changed host metadata forbids Send. This is not proof that the SDK was invoked."""
        return await communication("verify", ctx, binding=binding, message_id=message_id, delivery_attempt_id=delivery_attempt_id)

    @mcp.tool(name="workflow_communication_report", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def report(binding: Binding, message_id: MessageId, delivery_attempt_id: MessageId,
                     outcome: Annotated[str, Field(pattern=r"^(accepted|rejected|unknown)$", description="Observed host outcome; acceptance is not a read receipt.")], ctx: Context) -> CallToolResult:
        """App-only record an SDK outcome without retrying delivery. Unknown is terminal for this attempt. A late report never revokes an existing read receipt."""
        return await communication("report", ctx, binding=binding, message_id=message_id, delivery_attempt_id=delivery_attempt_id, outcome=outcome)

    @mcp.resource(ui_uri, name="workflow_pilot_projects", title="Workflow Pilot",
                  mime_type="text/html;profile=mcp-app",
                  meta={"openai/ui": {"preferredDisplayMode": "fullscreen", "availableDisplayModes": ["inline", "fullscreen"]},
                        "ui": {"csp": {"connectDomains": [], "resourceDomains": []}},
                        "openai/widgetCSP": {"connect_domains": [], "resource_domains": []}})
    def panel_resource() -> str:
        return panel_html

    @mcp.resource(LEGACY_UI_URI, name="workflow_pilot_legacy_panel", title="Обновите панель Workflow Pilot",
                  mime_type="text/html;profile=mcp-app")
    def legacy_panel_resource() -> str:
        # A stale catalogue may still request the old address. Never silently
        # place a different operational protocol under that historical key.
        return LEGACY_PANEL_HTML

    @mcp.tool(name="workflow_pilot_panel", title="Workflow Pilot", annotations=CONNECT,
              meta={"ui": ui, "openai/ui": {"entrypoints": [{"type": "global"}, {"type": "thread"}]}})
    async def panel(ctx: Context, enrollment_ticket: Annotated[str | None, Field(pattern=r"^[a-f0-9]{64}$", description="Opaque invitation from this session's Workflow Pilot startup context; never invent or share it.")] = None) -> CallToolResult:
        """Open Workflow Pilot beside this conversation. With the bootstrap invitation, register this existing local session using fresh host identity; retrying the same binding is safe. No manual run/participant transfer or join is required for working plans. Without an invitation, open the existing panel. Success does not prove panel readiness, permission or model wakeup; never bypass host confirmations."""
        return result(await asyncio.to_thread(bridge.call, {"action": "panel", "metadata": host_metadata(ctx),
                                                            **({"enrollment_ticket": enrollment_ticket} if enrollment_ticket else {})}))

    @mcp.tool(name="workflow_open_project", title="Сведения о проектах Workflow Pilot", annotations=READ)
    async def open_project(project_id: Annotated[str | None, Field(min_length=1, max_length=512, description="Omit to list local projects; otherwise use an exact id from that list.")] = None) -> CallToolResult:
        """Read local projects or one project's current sessions for direct conversation binding. Returns data without UI; does not switch a sidebar, create a conversation or change cloud project membership."""
        return result(await asyncio.to_thread(bridge.call, {"action": "list"} if project_id is None else {"action": "open", "projectId": project_id}))

    @mcp.tool(name="workflow_connect_project", title="Подключить сессию к проекту", annotations=CONNECT)
    async def connect_project(
        project_id: Annotated[str, Field(min_length=1, max_length=512, description="Exact project id from workflow_open_project.")],
        ctx: Context,
        request_id: Annotated[str | None, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Optional connection request UUID; reuse on retries, or omit for a new direct connection.")] = None,
    ) -> CallToolResult:
        """Bind this existing conversation to a local project at the user's request and return its complete recovery. Discover the exact project id with workflow_open_project first. Read all returned context before acting. Repeated calls do not duplicate sessions. Requires host openai/session metadata; never invent a conversation id. No model turn or new conversation is launched; cloud membership is unchanged."""
        meta = ctx.request_context.meta
        metadata = meta.model_dump(by_alias=True) if meta else {}
        metadata = {key: metadata[key] for key in ("openai/session", "openai/subject", "openai/organization")
                    if isinstance(metadata.get(key), str) and len(metadata[key]) <= 512}
        return result(await asyncio.to_thread(bridge.call, {"action": "connect", "projectId": project_id,
                                                            "requestId": request_id or str(uuid4()), "metadata": metadata}))
