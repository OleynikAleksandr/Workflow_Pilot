"""ChatGPT UI tools routed to the running Workflow Pilot backend (the Control owner)."""
import asyncio
import http.client
import json
import re
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from mcp.server.fastmcp import Context
from mcp.types import CallToolResult, TextContent, ToolAnnotations
from pydantic import BaseModel, ConfigDict, Field

UI_URI = "ui://workflow-pilot/projects-v1.html"
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


class CommunicationEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: MessageId
    event_type: Annotated[str, Field(pattern=r"^(sdk\.(invoked|accepted|rejected|timeout|error)|report\.failed|stop\.(local|failed)|host\.(handshake|context_changed)|visibility\.changed|panel\.(pagehide|dispose)|wait\.error|connection\.restored)$")]
    client_sequence: Annotated[int, Field(ge=1)]
    client_time: Annotated[str, Field(max_length=40)]
    duration_ms: Annotated[float, Field(ge=0, le=86400000)]
    message_id: MessageId | None = None
    error_code: Annotated[str | None, Field(max_length=80)] = None
    message_supported: bool | None = None


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
            connection.request("POST", "/plugin", json.dumps(payload).encode("utf-8"),
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
    ui = {"resourceUri": UI_URI}

    async def communication(action, ctx, **args):
        binding = args.pop("binding", None)
        if binding is not None:
            args.update(binding.model_dump())
        return result(await asyncio.to_thread(bridge.call, {**args, "action": "communication." + action,
                                                           "metadata": host_metadata(ctx)}))

    @mcp.tool(name="workflow_communication_join", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def join(run_id: RunId, role: Annotated[str, Field(pattern=r"^(O|E)$", description="Role O or E; two different conversations are required.")], ctx: Context) -> CallToolResult:
        """Join a communication run in this conversation. Return the participant id for binding the existing panel. Does not enable delivery or send to a model. Missing host identity is an explicit refusal."""
        return await communication("join", ctx, run_id=run_id, role=role)

    @mcp.tool(name="workflow_communication_send_message", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def send_message(run_id: RunId, participant_id: ParticipantId, recipient_id: ParticipantId,
                           kind: Annotated[str, Field(pattern=r"^(question|answer|result)$", description="Finite exchange: question, answer or final result.")],
                           body: Annotated[str, Field(min_length=1, max_length=4096, description="Experiment text, at most 4096 UTF-8 bytes; never secrets.")],
                           idempotency_key: RunId, ctx: Context,
                           in_reply_to: Annotated[str | None, Field(max_length=128, description="Received message id; required for answer/result.")] = None) -> CallToolResult:
        """Queue an addressed experiment message. Same key/content returns the same message; conflicting content is rejected. Queue acceptance is not SDK acceptance or model reading. End your turn after sending; never call app-only wait."""
        return await communication("send", ctx, run_id=run_id, participant_id=participant_id, recipient_id=recipient_id,
                                   kind=kind, body=body, idempotency_key=idempotency_key, in_reply_to=in_reply_to)

    @mcp.tool(name="workflow_communication_read_message", annotations=CONNECT, meta={"ui": {"visibility": ["model"]}})
    async def read_message(run_id: RunId, participant_id: ParticipantId, message_id: MessageId, ctx: Context) -> CallToolResult:
        """Read an addressed message and record its receipt. Identity must match the recipient. Reading is a mutation, separate from host acceptance, and never causes another notification. No UI resource is returned."""
        return await communication("read", ctx, run_id=run_id, participant_id=participant_id, message_id=message_id)

    @mcp.tool(name="workflow_communication_probe", annotations=LAUNCH, meta={"ui": {"visibility": ["model"]}})
    async def probe(run_id: RunId, participant_id: ParticipantId,
                    delay_ms: Annotated[int, Field(ge=25, le=60000, description="One-shot delay in milliseconds. Enable the panel first, then end your turn.")], ctx: Context) -> CallToolResult:
        """Schedule one control message to yourself for an explicitly enabled panel. Stop cancels it. No general scheduler and no active-model wait. A fixture success does not prove ChatGPT wakeup."""
        return await communication("probe", ctx, run_id=run_id, participant_id=participant_id, delay_ms=delay_ms)

    @mcp.tool(name="workflow_communication_status", annotations=READ, meta={"ui": {"visibility": ["app", "model"]}})
    async def status(run_id: RunId, participant_id: ParticipantId, ctx: Context) -> CallToolResult:
        """Read this participant's communication state without launching a model or returning UI."""
        return await communication("status", ctx, run_id=run_id, participant_id=participant_id)

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

    @mcp.tool(name="workflow_communication_bind", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def bind(binding: Binding, ctx: Context) -> CallToolResult:
        """App-only: compare fresh host metadata with the model's join. Does not enable sending. Rebind each new panel instance; a sidebar selection is not an address."""
        return await communication("bind", ctx, binding=binding)

    @mcp.tool(name="workflow_communication_enable", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def enable(binding: Binding, message_supported: Annotated[bool, Field(description="The real SDK exposes experimental openai/message on this host.")], ctx: Context) -> CallToolResult:
        """App-only explicit user permission for ten minutes. Returns a fresh generation; never restore permission automatically on reload."""
        return await communication("enable", ctx, binding=binding, message_supported=message_supported)

    @mcp.tool(name="workflow_communication_stop", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def stop(binding: Binding, ctx: Context) -> CallToolResult:
        """App-only revoke sending and pending probe. Cannot cancel a request already handed to the host. A local stop is separate from this server acknowledgment."""
        return await communication("stop", ctx, binding=binding)

    @mcp.tool(name="workflow_communication_wait", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def wait(binding: Binding, after_seq: Annotated[int, Field(ge=0, description="Last event sequence seen by this panel; one outstanding wait per instance.")], ctx: Context) -> CallToolResult:
        """App-only long poll, up to 25 seconds; timeout may be repeated. Carries events and one pending delivery. Never call from a model turn."""
        return await communication("wait", ctx, binding=binding, after_seq=after_seq)

    @mcp.tool(name="workflow_communication_claim", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def claim(binding: Binding, message_id: MessageId, ctx: Context) -> CallToolResult:
        """App-only consume-once delivery claim. A lost claim result is never retried or returned to pending. Requires current permission and fresh matching host metadata."""
        return await communication("claim", ctx, binding=binding, message_id=message_id)

    @mcp.tool(name="workflow_communication_verify", annotations=LAUNCH, meta={"ui": {"visibility": ["app"]}})
    async def verify(binding: Binding, message_id: MessageId, delivery_attempt_id: MessageId, ctx: Context) -> CallToolResult:
        """App-only final identity/permission check and one-shot send intent immediately before SDK target:active/send:true. Missing or changed host metadata forbids Send. This is not proof that the SDK was invoked."""
        return await communication("verify", ctx, binding=binding, message_id=message_id, delivery_attempt_id=delivery_attempt_id)

    @mcp.tool(name="workflow_communication_report", annotations=CONNECT, meta={"ui": {"visibility": ["app"]}})
    async def report(binding: Binding, message_id: MessageId, delivery_attempt_id: MessageId,
                     outcome: Annotated[str, Field(pattern=r"^(accepted|rejected|unknown)$", description="Observed host outcome; acceptance is not a read receipt.")], ctx: Context) -> CallToolResult:
        """App-only record an SDK outcome without retrying delivery. Unknown is terminal for this attempt. A late report never revokes an existing read receipt."""
        return await communication("report", ctx, binding=binding, message_id=message_id, delivery_attempt_id=delivery_attempt_id, outcome=outcome)

    @mcp.resource(UI_URI, name="workflow_pilot_projects", title="Workflow Pilot",
                  mime_type="text/html;profile=mcp-app",
                  meta={"openai/ui": {"preferredDisplayMode": "fullscreen", "availableDisplayModes": ["inline", "fullscreen"]},
                        "ui": {"csp": {"connectDomains": [], "resourceDomains": []}},
                        "openai/widgetCSP": {"connect_domains": [], "resource_domains": [],
                                             "redirect_domains": ["https://chatgpt.com"]}})
    def panel_resource() -> str:
        return (Path(__file__).parent / "plugin-ui.html").read_text(encoding="utf-8")

    @mcp.tool(name="workflow_plugin_wait", title="Ожидать запуск из Workflow Pilot", annotations=LAUNCH,
              meta={"ui": {"visibility": ["app"]}})
    async def wait_launch(receiver_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Unique receiver id for this explicitly prepared panel instance.")]) -> CallToolResult:
        """App-only, explicit one-shot wait, at most 45 seconds. Never call automatically or poll. Does not launch a model or create a conversation. Keep this panel open; the user triggers one request from the local Workflow Pilot menu."""
        return result(await asyncio.to_thread(bridge.call, {"action": "wait", "receiverId": receiver_id}))

    @mcp.tool(name="workflow_plugin_claim", title="Принять одну команду запуска", annotations=LAUNCH,
              meta={"ui": {"visibility": ["app"]}})
    async def claim_launch(
        receiver_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact receiver id used by the waiting panel.")],
        request_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact one-shot request id returned by workflow_plugin_wait.")],
    ) -> CallToolResult:
        """App-only consume-once launch ticket. After success the panel may send one new-conversation message through the host API. Never retry claim or send after an uncertain result. No DOM operations."""
        return result(await asyncio.to_thread(bridge.call, {"action": "claim", "receiverId": receiver_id, "requestId": request_id}))

    @mcp.tool(name="workflow_plugin_report", title="Результат запроса нового разговора", annotations=CONNECT,
              meta={"ui": {"visibility": ["app"]}})
    async def report_launch(
        receiver_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact receiver id used to claim this request.")],
        request_id: Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact claimed one-shot request id.")],
        outcome: Annotated[str, Field(pattern=r"^(accepted|unknown)$", description="Host API result: accepted or unknown; neither proves navigation or context reading.")],
    ) -> CallToolResult:
        """App-only report of host API outcome. Accepted does not prove visible navigation or context delivery. Never creates a conversation or retries a send."""
        return result(await asyncio.to_thread(bridge.call, {"action": "report", "receiverId": receiver_id,
                                                            "requestId": request_id, "outcome": outcome}))

    @mcp.tool(name="workflow_pilot_panel", title="Workflow Pilot", annotations=READ,
              meta={"ui": ui, "openai/ui": {"entrypoints": [{"type": "global"}, {"type": "thread"}]}})
    async def panel(
        project_id: Annotated[str | None, Field(min_length=1, max_length=512, description="Optional exact project id from the project list or successful workflow_connect_project result. Opens that project with its current sessions.")] = None,
    ) -> CallToolResult:
        """Open Workflow Pilot's panel beside this conversation. Lists registered local projects; with project_id also shows that project's current sessions. When starting from the panel's new-session message, call this FIRST with the supplied project_id, before workflow_connect_project and reading recovery. After connecting and reading recovery, call it again with the same project_id to refresh the session list before confirming readiness. Does not create another conversation, switch the embedded browser, or pin the panel across conversations. Tool success does not prove that the host has visibly rendered the panel."""
        selected = {}
        if project_id is not None:
            selected = await asyncio.to_thread(bridge.call, {"action": "open", "projectId": project_id})
            if "error" in selected:
                return result(selected)
        listing = await asyncio.to_thread(bridge.call, {"action": "list"})
        if "error" in listing:
            return result(listing)
        return result({**listing, **selected})

    @mcp.tool(name="workflow_open_project", title="Открыть проект Workflow Pilot", annotations=READ,
              meta={"ui": {**ui, "visibility": ["app", "model"]}})
    async def open_project(project_id: Annotated[str, Field(min_length=1, max_length=512, description="Project id returned by workflow_pilot_panel.")]) -> CallToolResult:
        """Open a registered project in the plugin panel. Does not switch the embedded browser or create a ChatGPT project."""
        return result(await asyncio.to_thread(bridge.call, {"action": "open", "projectId": project_id}))

    @mcp.tool(name="workflow_connect_project", title="Подключить сессию к проекту", annotations=CONNECT)
    async def connect_project(
        project_id: Annotated[str, Field(min_length=1, max_length=512, description="Project id from the Workflow Pilot panel.")],
        ctx: Context,
        request_id: Annotated[str | None, Field(pattern=r"^[0-9a-fA-F-]{36}$", description="Exact request id from the panel's new-session message; reuse on retries. Omit when the user asks to connect this existing conversation directly.")] = None,
    ) -> CallToolResult:
        """Bind this conversation to a local Workflow Pilot project and return its complete recovery context. Use when the user asks to connect the current conversation or starts a session from the panel. List projects first; do not guess the project id. Read the entire returned context before acting. No model turns are launched. Repeated calls do not create duplicate sessions. Requires the host's openai/session metadata; never invent a conversation id. The conversation may remain in ChatGPT Recents; this only records ownership in Workflow Pilot."""
        meta = ctx.request_context.meta
        metadata = meta.model_dump(by_alias=True) if meta else {}
        metadata = {key: metadata[key] for key in ("openai/session", "openai/subject", "openai/organization")
                    if isinstance(metadata.get(key), str) and len(metadata[key]) <= 512}
        return result(await asyncio.to_thread(bridge.call, {"action": "connect", "projectId": project_id,
                                                            "requestId": request_id or str(uuid4()), "metadata": metadata}))
