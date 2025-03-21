# PlayCanvas Editor MCP Server

An MCP Server for the PlayCanvas Editor.

<img width="1864" alt="Screenshot 2025-03-21 at 15 50 10" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

> [!IMPORTANT]  
> At the moment, the MCP Server needs to be driven by Anthropic's Claude. Our experience shows that the free tier for Claude does not deliver a big enough chat context to operate the MCP Server reliably. Therefore, we strongly recommend subscribing to a Pro Claude account.

## Installation

Run `npm install` to install all dependencies.

### Install Chrome Extension

1. Visit `chrome://extensions/` and enable Developer mode
2. Click `Load unpacked` and select the `extensions` folder
3. Load the PlayCanvas Editor. The extension should be loaded.

### Run MCP Server

The MCP Server can be driven by Cursor (using Claude Sonnet 3.5 or 3.7) or Claude Desktop. We have found Claude Desktop to be generally more reliable.

#### Claude Desktop

1. Install Claude Desktop.
2. Go to `Claude` > `Settings`.
3. Select `Developer` and then `Edit Config`.
4. This will open `claude_desktop_config.json`, your MCP Config JSON file.

#### Cursor

1. Select `File` > `Preferences` > `Cursor Settings`.
2. Click `+ Add new global MCP server`.
3. This will open `mcp.json`, your MCP Config JSON file.

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
        "/path/to/mcp-editor/src/server.ts"
      ]
    }
  }
}
```

The MCP server and Chrome extension should now be running. You can enter a command!

> [!IMPORTANT]  
> Ensure you have `Agent` selected. `Ask` and `Edit` modes will not recognize the MCP Server.

