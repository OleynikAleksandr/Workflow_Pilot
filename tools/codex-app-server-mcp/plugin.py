"""ChatGPT UI tools routed to the running Workflow Pilot Control owner."""
import asyncio
import http.client
import json
import re
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from mcp.server.fastmcp import Context
from mcp.types import CallToolResult, TextContent, ToolAnnotations
from pydantic import Field

UI_URI = "ui://workflow-pilot/projects-v1.html"
READ = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)
CONNECT = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=True, openWorldHint=False)


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
            return {"error": {"code": "PLUGIN_DESKTOP_REQUIRED", "message": "Откройте Workflow Pilot с поддержкой плагина и повторите действие."}}
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
            return {"error": {"code": "PLUGIN_DESKTOP_UNAVAILABLE", "message": "Workflow Pilot недоступен. Проверьте, что приложение открыто, и повторите действие."}}
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

    @mcp.resource(UI_URI, name="workflow_pilot_projects", title="Workflow Pilot",
                  mime_type="text/html;profile=mcp-app",
                  meta={"openai/ui": {"preferredDisplayMode": "fullscreen", "availableDisplayModes": ["inline", "fullscreen"]},
                        "ui": {"csp": {"connectDomains": [], "resourceDomains": []}}})
    def panel_resource() -> str:
        return (Path(__file__).parent / "plugin-ui.html").read_text(encoding="utf-8")

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
