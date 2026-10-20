"""Passive experimental UI only; no backend bridge, project or agent operations."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from time import monotonic
from uuid import uuid4

from mcp.types import CallToolResult, TextContent, ToolAnnotations

READ = ToolAnnotations(readOnlyHint=True, destructiveHint=False,
                       idempotentHint=True, openWorldHint=False)


def register_pip_probe(mcp, directory: Path):
    started, instance = monotonic(), str(uuid4())

    @mcp.tool(name="pip_probe_status", annotations=READ,
              meta={"ui": {"visibility": ["app"]}})
    def status() -> CallToolResult:
        """Synthetic clock only. No project, agent, permission or message data."""
        return CallToolResult(content=[], structuredContent={
            "synthetic": True, "instance": instance,
            "serverTime": datetime.now(timezone.utc).isoformat(),
            "tick": int(monotonic() - started),
        })

    def register_view(kind: str, title: str, description: str):
        # Freeze complete bytes and URI together for the lifetime of this server.
        html = (directory / f"pip-probe-{kind}.html").read_text(encoding="utf-8")
        uri = f"ui://workflow-pilot-probe/{kind}-{sha256(html.encode('utf-8')).hexdigest()}.html"

        @mcp.resource(uri, name=f"pip_probe_{kind}", title=title,
                      mime_type="text/html;profile=mcp-app",
                      meta={"ui": {"csp": {"connectDomains": [], "resourceDomains": []}},
                            "openai/ui": {"availableDisplayModes": ["inline", "pip"] if kind == "dialogue" else ["inline", "fullscreen"],
                                          "preferredDisplayMode": "inline"}})
        def resource() -> str:
            return html

        @mcp.tool(name=f"pip_probe_open_{kind}", title=title, description=description,
                  annotations=READ, meta={"ui": {"resourceUri": uri},
                                         "openai/ui": {"preferredModelDisplayMode": "inline"}})
        def open_view() -> CallToolResult:
            return CallToolResult(content=[TextContent(
                type="text", text=f"{title}: запрошено открытие. Режим и совместная видимость ещё не подтверждены.")])

    register_view("plan", "Тестовая панель плана",
                  "Open an optional synthetic plan placeholder for an isolated two-view experiment. "
                  "This is not the real project plan; use workflow_pilot_panel for the real panel.")
    register_view("dialogue", "Тестовая переписка · PiP",
                  "Open a passive synthetic dialogue probe inline in the conversation, then request PiP, alongside the existing "
                  "Workflow Pilot panel. Only for an explicitly requested experiment. No real messages, "
                  "agent commands or plan changes. Tool success does not prove PiP or simultaneous visibility; "
                  "the user must check both views and close/reopen only this probe.")
