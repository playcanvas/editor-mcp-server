# PlayCanvas Editor MCP Server

[![npm](https://img.shields.io/npm/dm/@playcanvas/editor-mcp-server?label=npm)](https://www.npmjs.com/package/@playcanvas/editor-mcp-server)
[![Version](https://img.shields.io/github/v/release/playcanvas/editor-mcp-server?include_prereleases&label=version)](https://github.com/playcanvas/editor-mcp-server/releases)
[![CI](https://github.com/playcanvas/editor-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/playcanvas/editor-mcp-server/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/playcanvas/editor-mcp-server)](LICENSE)
[![Context](https://img.shields.io/badge/context-~43k_tokens_of_tool_definitions-blue)](#context-cost)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat&logo=discord&logoColor=white&color=black)](https://discord.gg/RSaMRzg)
[![Reddit](https://img.shields.io/badge/Reddit-FF4500?style=flat&logo=reddit&logoColor=white&color=black)](https://www.reddit.com/r/PlayCanvas)
[![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white&color=black)](https://x.com/playcanvas)

| [npm](https://www.npmjs.com/package/@playcanvas/editor-mcp-server) | [Developer Site](https://developer.playcanvas.com/) | [Editor Manual](https://developer.playcanvas.com/user-manual/editor/) | [API Reference](https://api.playcanvas.com/editor/) | [Blog](https://blog.playcanvas.com/) | [Forum](https://forum.playcanvas.com/) |

An MCP server that lets AI agents automate the
[PlayCanvas Editor](https://playcanvas.com/products/editor) and check that scenes actually run. The
MCP client is built into the Editor, so no browser extension is needed.

<img width="1864" alt="PlayCanvas Editor driven by an MCP client" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

## Install

Add the server to your MCP client. For Claude Code:

```bash
claude mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

Requires [Node.js](https://nodejs.org/) 22.18+. Add the server once per agent: two servers take
turns owning the Editor port.

<details>
<summary><strong>Claude Desktop, Cursor, and a shared project <code>.mcp.json</code></strong></summary>

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

Add this to `claude_desktop_config.json` (`Settings` > `Developer` > `Edit Config`), to Cursor's
global MCP servers (`Cursor Settings` > `MCP`), or to a `.mcp.json` committed to the project root
for Claude Code. On Windows, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@playcanvas/editor-mcp-server"]`.

</details>

<details>
<summary><strong>Codex CLI and app</strong></summary>

```bash
codex mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server
```

On Windows, insert `cmd /c` before `npx`. If the first run times out while `npx` downloads, raise
`startup_timeout_sec` under `[mcp_servers.playcanvas]` in `~/.codex/config.toml`.

</details>

Then open your project in the Editor, click the MCP button below Publish, and click `CONNECT`. To
start with no project open, use the MCP button next to `NEW PROJECT` on `playcanvas.com/editor`. Allow
Chrome's `Apps on device` permission when prompted; if the Editor stays on `Connecting`, it is
blocked. The default port is `52000`; to change it, pass `--port <number>` to the server and set the
same port in the Editor.

## Usage

Ask your agent for the outcome you want in the open project. For example:

```text
Add a spinning cube with a rotate script to the current scene, launch it, and capture a screenshot
of the running app to confirm it turns.
```

## Tools

| Category | Coverage |
| --- | --- |
| Projects | Listing, exact reads, creation, name, description and visibility edits, and opening a project in the connected Editor |
| Entity | Exact reads, filtered lists, resolution, search, script lookup, creation, schema-safe batch edits, duplication, hierarchy changes, deletion and component lifecycle |
| Scripts | Asset text reads and writes, parsing, attachment, attributes, ordering and removal |
| Assets | Exact reads, reference graphs, native creation, streamed upload and atomic download up to 512 MiB, schema-safe edits, moves, duplication, source replacement, reimport, deletion and materials |
| Templates | Instantiation and instance override inspection, application, reversion and unlinking |
| Animation | Animation state graph reads and edits, mapping-safe state renames and animation events |
| Processing | Lightmaps, model unwrap and cancellation, texture conversion, atlases, cubemaps, fonts, metadata, compressed variants, prefiltering, sprites and bundles |
| Scene | Exact reads, listing, loading, creation, duplication, rename, deletion and scene settings |
| Settings | Scoped project, private, user, session and scene settings reads and edits |
| Viewport | Camera and viewport state, visibility, capture and focus |
| Editor | Selection, edit-time logs, transform gizmo state, undo and redo |
| Builds | Listing, exact reads, creation options, streamed downloads, primary build selection and deletion |
| Store | PlayCanvas Store search and import, licenses, Sketchfab search and import, and My Assets search and import |
| Runtime | Launch lifecycle and options, engine version discovery, screenshots, logs, live state inspection and keyboard, mouse and touch input |
| VCS | Branches, checkpoints, restore and hard reset, merges, conflict resolution and checkpoint diffs |

Tools act on the project open in the connected Editor, one Editor at a time. Project tools also
work from the project manager at `playcanvas.com/editor` with no project open; opening a project
reloads the tab into it and reconnects automatically. Projects can't be deleted. Runtime tools open
a Launch window, so allow pop-ups for the Editor.

## Context cost

The 130 tool definitions total about 43,000 tokens (4 characters per token). Claude Code's
[MCP tool search](https://code.claude.com/docs/en/mcp) is on by default and loads only tool names at
start, about 1,000 tokens.

## Data and network use

The server has no telemetry. It listens on `127.0.0.1:52000` for `playcanvas.com` and localhost
pages, stops any other process holding that port, touches local files only for upload and download
tools, and makes one outbound request: `download_build` fetches the archive URL the Editor reports.

## Contributing

```bash
git clone https://github.com/playcanvas/editor-mcp-server.git
cd editor-mcp-server
npm install
npm run watch
```

Point your MCP client at `src/server.ts` with `"command": "node"`. `npm run debug` opens the MCP
Inspector and `npm run build` produces the published bundle. Report bugs in
[GitHub Issues](https://github.com/playcanvas/editor-mcp-server/issues).

## License

The PlayCanvas Editor MCP Server is released under the [MIT License](LICENSE).
