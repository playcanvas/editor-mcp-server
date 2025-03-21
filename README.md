# PlayCanvas Editor MCP Server

An MCP Server for automating the [PlayCanvas Editor](https://playcanvas.com/products/editor) using an LLM.

<img width="1864" alt="Screenshot 2025-03-21 at 15 50 10" src="https://github.com/user-attachments/assets/393ffe73-40eb-4e1b-9442-2295bbb63326" />

> [!IMPORTANT]  
> At the moment, the MCP Server needs to be driven by Anthropic's Claude. Our experience shows that the free tier for Claude does not deliver a big enough chat context to operate the MCP Server reliably. Therefore, we strongly recommend subscribing to a Pro Claude account.

## Available Tools

* `create_entity`
* `modify_entity`
* `duplicate_entities`
* `reparent_entity`
* `delete_entities`
* `list_entities`
* `add_components`
* `remove_components`
* `list_assets`
* `delete_assets`
* `instantiate_assets`
* `create_script`
* `set_script_text`
* `script_parse`
* `create_material`
* `set_material_diffuse`
* `set_render_component_material`
* `add_script_component_script`
* `modify_scene_settings`
* `query_scene_settings`
* `store_search`
* `store_get`
* `store_download`

## Installation

Run `npm install` to install all dependencies.

### Install Chrome Extension

1. Visit `chrome://extensions/` and enable Developer mode
2. Click `Load unpacked` and select the `extensions` folder
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
> In Cursor, ensure you have `Agent` selected. `Ask` and `Edit` modes will not recognize the MCP Server.

