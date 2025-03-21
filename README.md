# MCP-Editor

<img width="1864" alt="Screenshot 2025-03-21 at 15 50 10" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

A MCP Server for the PlayCanvas Editor

## Installation

Run `npm install` to install all dependencies

### Chrome Extension

1. Visit `chrome://extensions/` and enable Developer mode
2. Click `Load unpacked` and select the `extensions` folder
3. Load the PlayCanvas Editor. The extension should be loaded.

### MCP Server

#### Cursor

1. Select `File` > `Preferences` > `Cursor Settings`.
2. Click `+ Add new global MCP server`.
3. In `mcp.json`, add the following:

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
        "C:\\path\\to\\mcp-editor\\src\\server.ts"
      ]
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
        "~/path/to/mcp-editor/src/server.ts"
      ]
    }
  }
}
```

The MCP server and Chrome extension should now be running. You can enter a command (we recommend Claude Sonnet 3.7). Ensure you have `Agent` selected.

#### Agent Mode

1. Create an `.env` file and add `ANTHROPIC_API_KEY` (refer to `.env.template` for format).
2. Run `npm run agent` to start the agent.

## Tools Overview

TODO

