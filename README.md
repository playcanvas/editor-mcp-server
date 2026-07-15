    ██████╗ ██╗      █████╗ ██╗   ██╗ ██████╗ █████╗ ███╗   ██╗██╗   ██╗ █████╗ ███████╗
    ██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗████╗  ██║██║   ██║██╔══██╗██╔════╝
    ██████╔╝██║     ███████║ ╚████╔╝ ██║     ███████║██╔██╗ ██║██║   ██║███████║███████╗
    ██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║     ██╔══██║██║╚██╗██║╚██╗ ██╔╝██╔══██║╚════██║
    ██║     ███████╗██║  ██║   ██║   ╚██████╗██║  ██║██║ ╚████║ ╚████╔╝ ██║  ██║███████║
    ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝

    ███╗   ███╗ ██████╗██████╗        ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
    ████╗ ████║██╔════╝██╔══██╗       ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
    ██╔████╔██║██║     ██████╔╝       ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
    ██║╚██╔╝██║██║     ██╔═══╝        ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
    ██║ ╚═╝ ██║╚██████╗██║            ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
    ╚═╝     ╚═╝ ╚═════╝╚═╝            ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝

An MCP Server for automating the [PlayCanvas Editor](https://playcanvas.com/products/editor) using an LLM.

<img width="1864" alt="Screenshot 2025-03-21 at 15 50 10" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

The MCP client is built into the PlayCanvas Editor — no browser extension is needed. Install the server into your MCP client of choice (Claude Code, Codex, Claude Desktop, Cursor, …) and connect the Editor to it.

## Available Tools

* Entity
  * `list_entities`
  * `resolve_entities`
  * `create_entities`
  * `delete_entities`
  * `duplicate_entities`
  * `modify_entities`
  * `reparent_entity`
  * `add_components`
  * `remove_components`
  * `add_script_component_script`
  * `attach_script`
* Asset
  * `list_assets`
  * `create_assets`
  * `delete_assets`
  * `instantiate_template_assets`
  * `set_script_text`
  * `script_parse`
  * `set_material_diffuse`
  * `set_material_properties`
* Scene
  * `query_scene_settings`
  * `modify_scene_settings`
* Store
  * `store_search`
  * `store_get`
  * `store_download`
* Viewport
  * `capture_viewport`
  * `focus_viewport`
* Runtime (live Launch instance)
  * `launch_start`
  * `launch_stop`
  * `capture_runtime`
  * `read_runtime_logs`
  * `inject_input`

## Runtime Tools

The runtime tools drive a **real Launch instance** (the editor's Launch button) so
you can verify that a scene actually *runs*, not just how it looks at edit time:

* `launch_start` opens `https://launch.playcanvas.com/<sceneId>?debug=true` in a new
  window. The editor hands the MCP port to the launch page, which connects back to the
  MCP server as the "runtime" peer. `launch_start` returns `{ url, sceneId, ready }`.
* `capture_runtime` screenshots the running app (scripts/physics/animation active).
* `read_runtime_logs` returns the app's `console` output + uncaught
  exceptions/rejections (newest first, paginated; defaults to warnings + errors).
* `inject_input` dispatches keyboard / mouse / touch events to the running app
  (e.g. hold `W` for 500ms, click at a canvas coordinate, tap the screen), so you
  can drive end-to-end interactions and then verify with `capture_runtime`.
* `launch_stop` closes the launch window.

Notes:

* Allow pop-ups for the editor origin, otherwise `launch_start` cannot open the window.
* The launch page uses your existing PlayCanvas login session (same browser), so no
  extra auth step is needed.

## Response Format

Every tool returns a single, consistent **envelope** so agents can pattern-match on a stable shape:

```jsonc
{
  "data": <result> | null,   // business payload; an empty set is [], never an error
  "meta": {
    "tool": "entities:list",
    "status": "ok" | "error",
    "message": "...",          // present only on error; actionable, with a recovery hint
    // list tools also include pagination metadata:
    "total": 120, "count": 50, "hasMore": true, "nextCursor": "50"
  }
}
```

Notes for tool authors / agents:

* **Errors** never use a top-level `error` field; they set `meta.status = "error"` and put an actionable message in `meta.message` (the protocol-level `isError` flag is also set).
* **Empty results** (`list_*`, `resolve_entities`) are a successful empty list, not an error.
* **Pagination**: `list_entities` / `list_assets` accept `limit` (default 50) + `offset`. Page using `meta.nextCursor` (pass it back as `offset`) and stop when `meta.hasMore` is `false`.
* **State snapshots**: mutating tools (`create_entities`, `modify_entities`, `add_components`, `reparent_entity`, `duplicate_entities`, `instantiate_template_assets`, …) return the resulting entity/asset summaries — including a human-readable hierarchy `path` — so you rarely need a follow-up `list_entities` call.
* **Annotations**: read-only tools declare `readOnlyHint`, destructive tools (`delete_*`) declare `destructiveHint`, and store tools declare `openWorldHint` (they reach the network).
* Image tools (`capture_viewport`) return a protocol `image` block plus a parallel `text` block carrying the same `meta`.

## Installation

Requires [Node.js](https://nodejs.org/) 18+. The server is published to npm as [`@playcanvas/editor-mcp-server`](https://www.npmjs.com/package/@playcanvas/editor-mcp-server), so every client below runs it with `npx` — nothing to clone or build.

### Claude Code

```sh
claude mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

To share the server with everyone working on a repo, commit a `.mcp.json` to the project root instead:

```json
{
  "mcpServers": {
    "playcanvas": {
      "command": "npx",
      "args": ["-y", "@playcanvas/editor-mcp-server"]
    }
  }
}
```

### Codex

The Codex CLI and the Codex app share `~/.codex/config.toml`, so one command covers both:

```sh
codex mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

> [!NOTE]
> On Windows, use `codex mcp add playcanvas -- cmd /c npx -y @playcanvas/editor-mcp-server`. If the server times out on first run (while `npx` downloads the package), raise the startup timeout in `~/.codex/config.toml` under `[mcp_servers.playcanvas]`: `startup_timeout_sec = 60`.

> [!NOTE]
> ChatGPT itself (web and desktop) only supports remote MCP connectors, so it cannot run this local server — Codex is the OpenAI surface to use.

### Claude Desktop

Go to `Claude` > `Settings` > `Developer` > `Edit Config` and add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playcanvas": {
      "command": "npx",
      "args": ["-y", "@playcanvas/editor-mcp-server"]
    }
  }
}
```

> [!NOTE]
> On Windows, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@playcanvas/editor-mcp-server"]`.

### Cursor

Select `File` > `Preferences` > `Cursor Settings` > `MCP` > `Add new global MCP server` and add the same JSON as for Claude Desktop.

### Custom Port

The server listens for the Editor on WebSocket port `52000` by default. To change it, append `--port <number>` to the `npx` args (e.g. `npx -y @playcanvas/editor-mcp-server --port 52001`) and set the same port in the Editor's MCP popover.

## Connecting the Editor to the MCP Server

1. Open your project in the PlayCanvas Editor.
2. Click the MCP button at the bottom of the toolbar (below the Publish button).
3. Check that the port matches your MCP config (default `52000`) and click `CONNECT`.

Launch windows opened via `launch_start` (or the Launch button) connect automatically as the runtime peer.

> [!NOTE]
> You can currently only connect one instance of the PlayCanvas Editor to the MCP Server at any one time.

You should now be able to issue commands from your MCP client.

## Development

To hack on the server itself:

```sh
git clone https://github.com/playcanvas/editor-mcp-server.git
cd editor-mcp-server
npm install
npm run watch   # or: npm start
```

Point your MCP client at the checkout instead of the npm package by replacing the `npx` args with `["tsx", "/path/to/editor-mcp-server/src/server.ts"]`. `npm run debug` starts the server under the MCP Inspector.
