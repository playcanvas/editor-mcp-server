import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create an MCP server
const server = new McpServer({
    name: 'PlayCanvas',
    version: '1.0.0'
});

server.tool(
    'create_entity',
    'Create a new entity',
    {
        name: z.string()
    },
    async ({ name }) => {
        return {
            content: [{
                type: 'text',
                text: `Created entity ${name}: ${JSON.stringify({ id: 1 })}`
            }]
        };
    }
);

server.tool(
    'set_entity_position',
    'Set the position of an entity',
    {
        id: z.number(),
        position: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number()
        })
    },
    async ({ id, position }) => {
        return {
            content: [{
                type: 'text',
                text: `Set position of entity ${id} to ${JSON.stringify(position)}`
            }]
        };
    }
);

server.tool(
    'create_component',
    'Create a new component on an entity',
    {
        id: z.number(),
        name: z.string(),
        type: z.string().optional().default('box')
    },
    async ({ id, name, type }) => {
        return {
            content: [{
                type: 'text',
                text: `Created component ${name} of type ${type} on entity ${id}: ${JSON.stringify({
                    id,
                    name,
                    type
                })}`
            }]
        };
    }
);

server.tool(
    'set_render_component_material',
    'Set the material on a render component',
    {
        id: z.number(),
        materialId: z.number()
    },
    async ({ id, materialId }) => {
        return {
            content: [{
                type: 'text',
                text: `Set material ${materialId} on render component ${id}`
            }]
        };
    }
);

server.tool(
    'create_material',
    'Create a new material',
    {
        name: z.string()
    },
    async ({ name }) => {
        return {
            content: [{
                type: 'text',
                text: `Created material ${name}: ${JSON.stringify({ id: 1 })}`
            }]
        };
    }
);

server.tool(
    'set_material_diffuse',
    'Set diffuse property on a material',
    {
        id: z.number(),
        color: z.object({
            r: z.number(),
            g: z.number(),
            b: z.number()
        })
    },
    async ({ id, color }) => {
        return {
            content: [{
                type: 'text',
                text: `Set diffuse color of material ${id} to ${JSON.stringify(color)}`
            }]
        };
    }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
