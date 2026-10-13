# PlayCanvas Editor

A Claude plugin that connects the [PlayCanvas Editor](https://playcanvas.com/products/editor) to Claude through a local MCP server, so Claude can read and edit the project open in your browser: entities, assets, scripts, scenes, settings, builds and more.

It works on the project open in the Editor, and can also list, create, rename and open your projects from the Editor's project manager. It can't delete projects.

## What it runs

When the plugin is enabled, Claude Code starts one MCP server with:

```sh
npx -y @playcanvas/editor-mcp-server@0.7.1
```

- `npx` downloads [`@playcanvas/editor-mcp-server`](https://www.npmjs.com/package/@playcanvas/editor-mcp-server) at that exact version from your npm registry on first run and caches it. The package is a single self-contained bundle with no runtime dependencies, built from [this repository](https://github.com/playcanvas/editor-mcp-server). It requires [Node.js](https://nodejs.org/) 22.18 or later.
- The server talks to Claude over stdio and listens for the Editor on a WebSocket at `127.0.0.1:52000`. It is not reachable from your network, and browser pages can connect only from `playcanvas.com` or localhost origins.
- Only one server can own the port. On startup, if another process is already listening on it, the server asks it to hand over and stops it if it doesn't.
- The server reads and writes local files only when a tool asks it to, such as uploading an asset from disk or saving a downloaded asset or build. Build downloads fetch the build archive from the URL the Editor reports.
- Project tools run inside the connected Editor tab with your signed-in session, the same way the Editor's own project manager does. They can create projects on your account (or an organization you belong to) and change a project's name, description or visibility. Opening a project reloads the tab into it.

The plugin contains no other code and sends nothing anywhere else.

## Before you install

If you already added the server by hand, for example with `claude mcp add playcanvas …` or a project `.mcp.json`, remove it first. Otherwise two servers start and take turns owning port `52000`.

```sh
claude mcp remove playcanvas
```

The plugin isn't published to a marketplace yet. To try it from a checkout of this repository:

```sh
claude --plugin-dir plugin
```

The plugin always uses port `52000`. To use a different port, skip the plugin and add the server by hand with `--port <number>`, as the [main README](https://github.com/playcanvas/editor-mcp-server#install) describes.

## Connecting the Editor

1. Open your project in the PlayCanvas Editor, or open the project manager at `playcanvas.com/editor` to start with no project.
2. Click the MCP button: at the bottom of the toolbar (below the Publish button) in a project, or next to `NEW PROJECT` in the project manager.
3. Check that the port is `52000` and click `CONNECT`.

Chromium asks for permission before a page can connect to `127.0.0.1`. Allow it for the Editor when prompted (`Apps on device` in site settings). A blocked connection leaves the Editor on `Connecting`.

Only one Editor instance can be connected at a time. The tools then show up in `/mcp` under `plugin:playcanvas-editor:playcanvas`.

## License

[MIT](LICENSE)
