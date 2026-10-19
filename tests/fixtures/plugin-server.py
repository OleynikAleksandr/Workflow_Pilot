"""Isolated real MCP transport; no executor, user profile, or model client."""
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from mcp.server.fastmcp import FastMCP
from plugin import register_plugin

http = len(sys.argv) > 3 and sys.argv[3] == "http"
mcp = FastMCP("Workflow Pilot Local Mac" if http else "Workflow Pilot fixture", stateless_http=http, json_response=http)
register_plugin(mcp, Path(sys.argv[2]))
if http:
    import json
    import socket
    import uvicorn

    @mcp.tool()
    def bridge_status() -> dict:
        return {"fixture": True}

    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen()
    print(json.dumps({"port": listener.getsockname()[1]}), flush=True)
    uvicorn.Server(uvicorn.Config(mcp.streamable_http_app(), log_level="error")).run(sockets=[listener])
else:
    mcp.run(transport="stdio")
