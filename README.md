# PlayCanvas Editor MCP Server

[![npm](https://img.shields.io/npm/dm/@playcanvas/editor-mcp-server?label=npm)](https://www.npmjs.com/package/@playcanvas/editor-mcp-server)
[![Version](https://img.shields.io/github/v/release/playcanvas/editor-mcp-server?include_prereleases&label=version)](https://github.com/playcanvas/editor-mcp-server/releases)
[![CI](https://github.com/playcanvas/editor-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/playcanvas/editor-mcp-server/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/playcanvas/editor-mcp-server)](LICENSE)
[![Context](https://img.shields.io/badge/context-~42k_tokens_of_tool_definitions-blue)](#context-cost)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat&logo=discord&logoColor=white&color=black)](https://discord.gg/RSaMRzg)
[![Reddit](https://img.shields.io/badge/Reddit-FF4500?style=flat&logo=reddit&logoColor=white&color=black)](https://www.reddit.com/r/PlayCanvas)
[![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white&color=black)](https://x.com/playcanvas)

| [npm](https://www.npmjs.com/package/@playcanvas/editor-mcp-server) | [Developer Site](https://developer.playcanvas.com/) | [Editor Manual](https://developer.playcanvas.com/user-manual/editor/) | [API Reference](https://api.playcanvas.com/editor/) | [Blog](https://blog.playcanvas.com/) | [Forum](https://forum.playcanvas.com/) |

An MCP server that lets AI agents automate the
[PlayCanvas Editor](https://playcanvas.com/products/editor). The MCP client is built into the
Editor, so no browser extension is needed. Install the server into your MCP client (Claude Code,
Codex, Claude Desktop, Cursor, …) and connect the Editor to it.

<img width="1864" alt="PlayCanvas Editor driven by an MCP client" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

## Install

Add the server to your MCP client. For Claude Code:

```bash
claude mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

Requires [Node.js](https://nodejs.org/) 22.18+. The server is published to npm as
[`@playcanvas/editor-mcp-server`](https://www.npmjs.com/package/@playcanvas/editor-mcp-server), a
self-contained bundle with no runtime dependencies, so every client runs it with `npx`. Nothing to
clone or build.

Choose one installation route for each agent. Only one server can own the Editor port, so two
configurations for the same agent start two servers that take turns owning it.

### MCP clients

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

To share the server with everyone working on a repo, commit a `.mcp.json` to the project root
instead:

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

</details>

<details>
<summary><strong>Codex CLI and app</strong></summary>

The Codex CLI and the Codex app share `~/.codex/config.toml`, so one command covers both:

```bash
codex mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

On Windows, use `codex mcp add playcanvas -- cmd /c npx -y @playcanvas/editor-mcp-server`. If the
server times out on first run (while `npx` downloads the package), raise `startup_timeout_sec` under
`[mcp_servers.playcanvas]` in `~/.codex/config.toml`. ChatGPT itself only supports remote MCP
connectors, so Codex is the OpenAI surface to use.

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

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

On Windows, use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@playcanvas/editor-mcp-server"]`.

</details>

<details>
<summary><strong>Cursor</strong></summary>

Select `File` > `Preferences` > `Cursor Settings` > `MCP` > `Add new global MCP server` and add the
same JSON as for Claude Desktop.

</details>

### Connect the Editor

1. Open your project in the PlayCanvas Editor.
2. Click the MCP button at the bottom of the toolbar (below the Publish button).
3. Check that the port matches your MCP config (default `52000`) and click `CONNECT`.

Only one Editor instance can be connected to the server at a time.

Chromium gates a public page's connection to `127.0.0.1` behind a local access permission (Chrome
142+, extended to WebSockets in Chrome 147) granted **per origin**, so allow it when prompted. In
Chrome's site settings it is `Apps on device` (loopback). `Local network` covers LAN addresses and is
not required. Only the Editor needs it: the launch page is bridged through the Editor rather than
opening a socket of its own. If the Editor sits on `Connecting`, open its site settings and allow
it. A blocked connection fails silently and looks exactly like a server that isn't running.

### Custom port

The server listens for the Editor on WebSocket port `52000` by default. To change it, append
`--port <number>` to the `npx` args and set the same port in the Editor's MCP popover.

## Why PlayCanvas Editor MCP Server

- Work in the Editor you already have open. The MCP client is built in, so there is no extension or
  separate browser to drive.
- Cover entities, scripts, assets, templates, animation, scenes, settings, builds, Store imports and
  version control from one server.
- Verify that a scene actually runs: launch it, screenshot the running app, read its logs, query live
  state, and inject keyboard, mouse and touch input.
- Get a consistent `{ data, meta }` envelope from every tool, with actionable errors, pagination and
  the resulting summaries from mutating calls.
- Stream asset uploads and downloads of up to 512 MiB in 1 MiB chunks.

## Usage

Connect the Editor, then ask your agent for the outcome you want in the open project. For example:

```text
Add a spinning cube with a rotate script to the current scene, launch it, and capture a screenshot
of the running app to confirm it turns.
```

```text
Create a branch, import a chair from the PlayCanvas Store, place it beside the table, and take a
checkpoint so I can diff the change.
```

## Tools

| Category | Driver coverage | Tools |
| --- | --- | --- |
| Entity | Exact reads, filtered lists, resolution, search, script lookup, creation, schema-safe batch edits, duplication, hierarchy changes, deletion and component lifecycle | `list_entities`, `get_entity`, `resolve_entities`, `search_entities`, `find_entities_by_script`, `create_entities`, `modify_entities`, `duplicate_entities`, `reparent_entity`, `delete_entities`, `add_components`, `remove_components` |
| Scripts | Asset text reads and writes, parsing, attachment, attributes, ordering and removal | `get_asset_text`, `set_asset_text`, `set_script_text`, `script_parse`, `add_script_component_script`, `attach_script`, `add_entity_scripts`, `remove_entity_scripts`, `move_entity_script` |
| Assets | Exact reads, reference graphs, native creation, streamed upload and atomic download up to 512 MiB, schema-safe edits, moves, duplication, source replacement, reimport, deletion and materials | `list_assets`, `get_asset`, `get_asset_references`, `create_assets`, `upload_assets`, `modify_assets`, `move_assets`, `duplicate_assets`, `replace_asset`, `reimport_assets`, `download_asset`, `delete_assets`, `set_material_diffuse`, `set_material_properties` |
| Templates | Instantiation and instance override inspection, application, reversion and unlinking | `instantiate_template_assets`, `get_template_overrides`, `apply_template_overrides`, `revert_template_overrides`, `unlink_template_instances` |
| Animation | Animation state graph reads and edits, mapping-safe state renames and animation events | `get_anim_state_graph`, `modify_anim_state_graph`, `get_animation_events`, `modify_animation_events` |
| Processing | Lightmaps, model unwrap and cancellation, texture conversion, atlases, cubemaps, fonts, metadata, compressed variants, prefiltering, sprites and bundles | `bake_lightmaps`, `unwrap_model_asset`, `cancel_model_unwrap`, `convert_texture_asset`, `create_texture_atlas`, `create_cubemap_from_texture`, `process_font_asset`, `generate_texture_metadata`, `process_texture_variants`, `prefilter_cubemap`, `clear_cubemap_prefilter`, `modify_sprite_asset`, `modify_bundle_asset` |
| Scene | Exact reads, listing, loading, creation, duplication, rename, deletion and scene settings | `list_scenes`, `get_scene`, `load_scene`, `create_scene`, `duplicate_scene`, `rename_scene`, `delete_scene`, `query_scene_settings`, `modify_scene_settings` |
| Settings | Scoped project, private, user, session and scene settings reads and edits | `query_settings`, `modify_settings`, `query_project_settings`, `modify_project_settings` |
| Viewport | Camera and viewport state, visibility, capture and focus | `query_viewport_state`, `set_viewport_state`, `query_viewport_visibility`, `set_viewport_visibility`, `capture_viewport`, `focus_viewport`, `focus_camera` |
| Editor | Selection, edit-time logs, transform gizmo state, undo and redo | `get_selection`, `set_selection`, `clear_selection`, `read_editor_logs`, `set_transform_gizmo`, `undo`, `redo` |
| Builds | Listing, exact reads, creation options, streamed downloads, primary build selection and deletion | `list_builds`, `get_build`, `create_build`, `download_build`, `set_primary_build`, `delete_build` |
| Store | PlayCanvas Store search and import, licenses, Sketchfab search and import, and My Assets search and import | `store_search`, `store_get`, `store_download`, `list_store_licenses`, `sketchfab_search`, `sketchfab_get`, `sketchfab_import`, `my_assets_search`, `my_assets_import` |
| Runtime | Launch lifecycle and options, engine version discovery, screenshots, logs, live state inspection and keyboard, mouse and touch input | `launch_start`, `launch_stop`, `list_engine_versions`, `capture_runtime`, `read_runtime_logs`, `query_runtime_state`, `inject_input` |
| VCS | Branches, checkpoints, restore and hard reset, merges, conflict resolution and checkpoint diffs | `vcs_status`, `list_branches`, `create_branch`, `switch_branch`, `close_branch`, `open_branch`, `delete_branch`, `list_checkpoints`, `create_checkpoint`, `get_checkpoint`, `restore_checkpoint`, `hard_reset_checkpoint`, `start_merge`, `get_merge`, `resolve_conflicts`, `get_conflict_file`, `apply_merge`, `cancel_merge`, `diff_checkpoints` |

Asset transfers over 20 MiB use 1 MiB chunks. The server reads and writes local files incrementally,
while the Editor spools uploads to browser storage and consumes downloads as streams instead of
buffering the entire transfer in memory.

The Runtime tools drive a real Launch instance (the Editor's Launch button) so an agent can verify
that a scene actually *runs*: screenshot the running app, read its console output, query live entity
state, and inject keyboard/mouse/touch input. Allow pop-ups for the editor origin so `launch_start`
can open the launch window. It reuses your existing PlayCanvas login session. The Editor relays
`runtime:*` calls to that window, so it needs no local access permission of its own. Calling
`launch_start` with no options adopts an app that is already running (`adopted: true` in the
response) instead of restarting it; pass any option to force a fresh launch. It also reports the
engine and graphics backend it ran with (`engineVersion`, `deviceType`) and a `sessionId` that
changes on every launch; omitting `engineVersion` uses the Editor's own selection, and
`list_engine_versions` reports the available channels and that default for both `launch_start` and
`create_build`. `create_build` normalises its result to `{ buildId, appId, status, url, name }`, so
the durable build job id that `get_build`, `set_primary_build` and `delete_build` take is returned
directly instead of the app id.

Every tool returns a consistent `{ data, meta }` envelope: `meta.status` is `ok` or `error` (with an
actionable message), list tools paginate via `limit`/`offset` and `meta.nextCursor`, and mutating
tools return the resulting entity/asset summaries so follow-up list calls are rarely needed.

All tools act on the project open in the connected Editor. The server does not discover, select,
create, delete, transfer, or administer projects, and project IDs are not tool inputs.

## Context cost

The server exposes 125 tools whose definitions total about 42,000 tokens, an average of about 340
per tool. Clients that load every MCP tool at session start pay that up front. Claude Code's
[MCP tool search](https://code.claude.com/docs/en/mcp) is on by default and loads only tool names at
start, about 1,000 tokens here, then each definition when the agent needs it. Estimates assume 4
characters per token.

## Data and network use

The server runs on your machine and has no telemetry:

- It talks to your MCP client over stdio and listens for the Editor on a WebSocket at
  `127.0.0.1:52000`. It is not reachable from your network, and browser pages can connect only from
  `playcanvas.com` or localhost origins.
- On startup, if another process already listens on the port, the server asks it to hand over and
  stops it if it doesn't.
- It reads and writes local files only when a tool asks it to, such as uploading an asset from disk
  or saving a downloaded asset or build.
- Its only outbound request is `download_build`, which fetches the build archive from the URL the
  Editor reports. Store, Sketchfab and My Assets tools run through the connected Editor.
- `npx` downloads the package from your npm registry on first run and caches it.

## Contributing

To work on the server itself, install [Node.js](https://nodejs.org/) 22.18 or later, then:

1. Clone the repository:

    ```bash
    git clone https://github.com/playcanvas/editor-mcp-server.git
    cd editor-mcp-server
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the server (Node runs the TypeScript source directly, no build step):

    ```bash
    npm run watch
    ```

4. Point your MCP client at the checkout instead of the npm package with `"command": "node"` and
   `"args": ["/path/to/editor-mcp-server/src/server.ts"]`.

`npm run debug` starts the server under the MCP Inspector and `npm run build` produces the
self-contained bundle that gets published. Report bugs and feature requests in
[GitHub Issues](https://github.com/playcanvas/editor-mcp-server/issues).

## License

The PlayCanvas Editor MCP Server is released under the [MIT License](LICENSE).
