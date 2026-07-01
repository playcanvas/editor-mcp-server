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

> [!IMPORTANT]  
> At the moment, the MCP Server needs to be driven by Anthropic's Claude. Our experience shows that the free tier for Claude does not deliver a big enough chat context to operate the MCP Server reliably. Therefore, we strongly recommend subscribing to a Pro Claude account.

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
  window. The extension injects a content script there that connects back to the MCP
  server as the "runtime" peer. `launch_start` returns `{ url, sceneId, ready }`.
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
* Reload the unpacked extension in `chrome://extensions/` after updating it so the new
  launch content script + permissions take effect.

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

Run `npm install` to install all dependencies.

### Install Chrome Extension

1. Visit `chrome://extensions/` and enable Developer mode
2. Click `Load unpacked` and select the `extension` folder
3. Load the PlayCanvas Editor. The extension should be loaded.

### Run MCP Server

The MCP Server can be driven by Cursor or Claude Desktop.

> [!TIP]  
> We have found Claude Desktop to be generally more reliable.

#### Claude Desktop

1. Install [Claude Desktop](https://claude.ai/download).
2. Go to `Claude` > `Settings`.
3. Select `Developer` and then `Edit Config`.
4. This will open `claude_desktop_config.json`, your MCP Config JSON file.

#### Cursor

1. Install [Cursor](https://www.cursor.com/).
2. Select `File` > `Preferences` > `Cursor Settings`.
3. Click `+ Add new global MCP server`.
4. This will open `mcp.json`, your MCP Config JSON file.

> [!TIP]  
> Also in `Cursor Settings`, select `Features` and scroll to the `Chat` section. Activate `Enable auto-run mode` to allow the LLM to run MCP tools without requiring constant authorization. You do this at your own risk (but we prefer it)!

> [!IMPORTANT]  
> In Cursor, ensure you have `Agent` selected. `Ask` and `Edit` modes will not recognize the MCP Server.

#### MCP Config JSON File

This is how your config should look:

Windows

```json
{
  "mcpServers": {
    "playcanvas": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "tsx",
        "C:\\path\\to\\editor-mcp-server\\src\\server.ts"
      ],
      "env": {
        "PORT": "52000"
      }
    }
  }
}
```

macOS

```json
{
  "mcpServers": {
    "playcanvas": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/editor-mcp-server/src/server.ts"
      ],
      "env": {
        "PORT": "52000"
      }
    }
  }
}
```

## Connecting the Editor to the MCP Server

The PlayCanvas Editor does not connect to the MCP Server automatically. To connect:

1. Activate a Chrome tab running the PlayCanvas Editor.
2. Select the Extensions icon to the right of the address bar.
3. Select PlayCanvas Editor MCP Extension to open the extension popup.
4. Select `CONNECT` (the port number should match what is set in your MCP Config JSON File).

> [!NOTE]
> You can currently only connect one instance of the PlayCanvas Editor to the MCP Server at any one time.

You should now be able to issue commands in Claude Desktop or Cursor.
