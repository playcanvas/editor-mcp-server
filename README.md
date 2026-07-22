# PlayCanvas Editor MCP Server

[![CI](https://img.shields.io/github/actions/workflow/status/playcanvas/editor-mcp-server/.github%2Fworkflows%2Fci.yml?label=ci)](https://github.com/playcanvas/editor-mcp-server/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/@playcanvas/editor-mcp-server)](https://www.npmjs.com/package/@playcanvas/editor-mcp-server)
[![License](https://img.shields.io/github/license/playcanvas/editor-mcp-server)](https://github.com/playcanvas/editor-mcp-server/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat&logo=discord&logoColor=white&color=black)](https://discord.gg/RSaMRzg)
[![Reddit](https://img.shields.io/badge/Reddit-FF4500?style=flat&logo=reddit&logoColor=white&color=black)](https://www.reddit.com/r/PlayCanvas)
[![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white&color=black)](https://x.com/intent/follow?screen_name=playcanvas)

| [User Manual](https://developer.playcanvas.com/user-manual/editor) | [API Reference](https://api.playcanvas.com/editor) | [Blog](https://blog.playcanvas.com) | [Forum](https://forum.playcanvas.com) |

An MCP server for automating the [PlayCanvas Editor](https://playcanvas.com/products/editor) with an LLM. The MCP client is built into the Editor — no browser extension needed. Install the server into your MCP client of choice (Claude Code, Codex, Claude Desktop, Cursor, …) and connect the Editor to it.

<img width="1864" alt="PlayCanvas Editor driven by an MCP client" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

## Installation

Requires [Node.js](https://nodejs.org/) 22.18+. The server is published to npm as [`@playcanvas/editor-mcp-server`](https://www.npmjs.com/package/@playcanvas/editor-mcp-server) — a self-contained, zero-dependency bundle — so every client below runs it with `npx`. Nothing to clone or build.

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
> On Windows, use `codex mcp add playcanvas -- cmd /c npx -y @playcanvas/editor-mcp-server`. If the server times out on first run (while `npx` downloads the package), raise `startup_timeout_sec` under `[mcp_servers.playcanvas]` in `~/.codex/config.toml`. ChatGPT itself only supports remote MCP connectors, so Codex is the OpenAI surface to use.

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

The server listens for the Editor on WebSocket port `52000` by default. To change it, append `--port <number>` to the `npx` args and set the same port in the Editor's MCP popover.

## Connecting the Editor

1. Open your project in the PlayCanvas Editor.
2. Click the MCP button at the bottom of the toolbar (below the Publish button).
3. Check that the port matches your MCP config (default `52000`) and click `CONNECT`.

You can now issue commands from your MCP client.

> [!NOTE]
> Only one Editor instance can be connected to the MCP server at a time.

## Available Tools

All tools act on the project open in the connected Editor. The server does not discover, select, create, delete, transfer, or administer projects, and project IDs are not tool inputs.

| Category | Tools |
| --- | --- |
| Entity | `list_entities`, `resolve_entities`, `search_entities`, `find_entities_by_script`, `create_entities`, `modify_entities`, `duplicate_entities`, `reparent_entity`, `delete_entities`, `add_components`, `remove_components` |
| Scripts | `get_asset_text`, `set_asset_text`, `set_script_text`, `script_parse`, `add_script_component_script`, `attach_script`, `add_entity_scripts`, `remove_entity_scripts`, `move_entity_script` |
| Assets | `list_assets`, `create_assets`, `upload_assets`, `modify_assets`, `move_assets`, `duplicate_assets`, `replace_asset`, `reimport_assets`, `download_asset`, `delete_assets`, `set_material_diffuse`, `set_material_properties` |
| Templates | `instantiate_template_assets`, `get_template_overrides`, `apply_template_overrides`, `revert_template_overrides`, `unlink_template_instances` |
| Animation | `get_anim_state_graph`, `modify_anim_state_graph`, `get_animation_events`, `modify_animation_events` |
| Processing | `bake_lightmaps`, `unwrap_model_asset`, `cancel_model_unwrap`, `convert_texture_asset`, `create_texture_atlas`, `create_cubemap_from_texture`, `modify_sprite_asset`, `modify_bundle_asset` |
| Scene | `list_scenes`, `get_scene`, `load_scene`, `create_scene`, `duplicate_scene`, `delete_scene`, `query_scene_settings`, `modify_scene_settings`, `query_project_settings`, `modify_project_settings` |
| Viewport | `query_viewport_state`, `set_viewport_state`, `query_viewport_visibility`, `set_viewport_visibility`, `capture_viewport`, `focus_viewport`, `focus_camera` |
| Editor | `get_selection`, `set_selection`, `clear_selection`, `set_transform_gizmo`, `undo`, `redo` |
| Builds | `list_builds`, `get_build`, `create_build`, `download_build`, `delete_build` |
| Store | `store_search`, `store_get`, `store_download` |
| Runtime | `launch_start`, `launch_stop`, `capture_runtime`, `read_runtime_logs`, `query_runtime_state`, `inject_input` |
| VCS | `vcs_status`, `list_branches`, `create_branch`, `switch_branch`, `close_branch`, `open_branch`, `delete_branch`, `list_checkpoints`, `create_checkpoint`, `get_checkpoint`, `restore_checkpoint`, `hard_reset_checkpoint`, `start_merge`, `get_merge`, `resolve_conflicts`, `get_conflict_file`, `apply_merge`, `cancel_merge`, `diff_checkpoints` |

The Runtime tools drive a real Launch instance (the Editor's Launch button) so an agent can verify that a scene actually *runs*: screenshot the running app, read its console output, query live entity state, and inject keyboard/mouse/touch input. Allow pop-ups for the editor origin so `launch_start` can open the launch window — it reuses your existing PlayCanvas login session.

Every tool returns a consistent `{ data, meta }` envelope: `meta.status` is `ok` or `error` (with an actionable message), list tools paginate via `limit`/`offset` and `meta.nextCursor`, and mutating tools return the resulting entity/asset summaries so follow-up list calls are rarely needed.

## Development

To hack on the server itself, ensure you have [Node.js](https://nodejs.org/) 22.18 or later installed. Follow these steps:

1. Clone the repository:

    ```sh
    git clone https://github.com/playcanvas/editor-mcp-server.git
    cd editor-mcp-server
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Start the server (Node runs the TypeScript source directly — no build step):

    ```sh
    npm run watch
    ```

4. Point your MCP client at the checkout instead of the npm package with `"command": "node"` and `"args": ["/path/to/editor-mcp-server/src/server.ts"]`.

`npm run debug` starts the server under the MCP Inspector and `npm run build` produces the self-contained bundle that gets published.
