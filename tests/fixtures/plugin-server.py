"""Isolated real MCP transport; no executor, user profile, or model client."""
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from mcp.server.fastmcp import FastMCP
from plugin import register_plugin

mcp = FastMCP("Workflow Pilot fixture")
register_plugin(mcp, Path(sys.argv[2]))
mcp.run(transport="stdio")
