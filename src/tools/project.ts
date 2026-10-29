import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

// the editor treats layer keys below this as built-in: no delete, not offered as sublayers
const USER_LAYER_KEY = 1000;

type Edit = { path: string; op?: string; value?: unknown };

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const lookup = (root: unknown, path: string) =>
    path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), root);

// own-property checks keep keys like __proto__ from reaching Object.prototype
const own = (node: Record<string, unknown>, key: string) => (Object.hasOwn(node, key) && isObject(node[key]) ? node[key] : {});

// merge dot-path keys into nested objects
const expand = (settings: Record<string, unknown>, out: Record<string, unknown> = {}) => {
    Object.entries(settings).forEach(([key, value]) => {
        const keys = key.split('.');
        const last = keys.pop() as string;
        const node = keys.reduce((n, k) => (n[k] = own(n, k)) as Record<string, unknown>, out);
        node[last] = isObject(value) ? expand(value, own(node, last)) : value;
    });
    return out;
};

// descend only into values that already exist: a leaf set under a missing parent is rejected by the server
const toEdits = (root: unknown, settings: Record<string, unknown>, prefix = ''): Edit[] =>
    Object.entries(settings).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        const current = lookup(root, path);
        return isObject(value) && !!current && typeof current === 'object' ? toEdits(root, value, path) : [{ path, value }];
    });

const layerError = (root: unknown, edits: Edit[]) => {
    const layers = lookup(root, 'layers');
    const keys = edits.filter(({ op }) => op !== 'unset').flatMap(({ path, value }) => {
        const [head, key] = path.split('.');
        if (head !== 'layers') return [];
        return key === undefined ? (isObject(value) ? Object.keys(value) : []) : [key];
    });
    const bad = keys.filter((key) => lookup(layers, key) === undefined && !(/^\d+$/.test(key) && parseInt(key, 10) >= USER_LAYER_KEY));
    if (!bad.length) return;
    const next = Object.keys(isObject(layers) ? layers : {}).reduce((max, key) => Math.max(max, (parseInt(key, 10) || 0) + 1), USER_LAYER_KEY);
    return `New layer keys must be integers >= ${USER_LAYER_KEY} (lower keys are built-in layers that cannot be deleted or given sublayers): ${bad.join(', ')}. Use layers.${next} for the next new layer.`;
};

const modify = async (wss: WSS, build: (root: unknown) => Edit[]) => {
    const res = await wss.raw('project:settings:query').catch((err: Error) => ({ error: err.message, data: undefined }));
    if (res.error) {
        return wss.fail('project:settings:query', res.error);
    }
    const edits = build(res.data);
    const error = layerError(res.data, edits);
    return error ? wss.fail('settings:modify', error) : wss.call('settings:modify', 'project', edits);
};

const SettingsScopeSchema = z.enum(['project', 'projectUser', 'projectPrivate', 'user', 'session', 'scene']);
const SettingEditSchema = z.union([
    z.object({
        path: z.string().min(1).describe('Dot-notation settings path'),
        op: z.literal('set').optional().describe('Defaults to set'),
        value: z.custom((value) => value !== undefined, 'Required for set')
    }).strict(),
    z.object({
        path: z.string().min(1).describe('Dot-notation settings path'),
        op: z.literal('unset')
    }).strict()
]);

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'modify_project_settings',
        {
            description: [
                'Modify project-wide settings such as physics engine, rendering device (WebGL2/WebGPU), layers, loading screen, script loading order, input, and resolution.',
                'Pass a partial object of setting path/value pairs (nested objects or dot-paths, e.g. { enableWebGpu: true, "layers.0.name": "World" }); only the provided fields change. Returns the full resulting project settings snapshot.',
                `Layers: add a custom layer under the next free key >= ${USER_LAYER_KEY} (e.g. { "layers.${USER_LAYER_KEY}": { name: "Water", opaqueSortMode: 2, transparentSortMode: 3 } }); lower keys are built-in and rejected for new layers.`,
                'A layer only renders once its sublayers are in layerOrder: set layerOrder to the current array plus { layer: <key>, transparent: false, enabled: true } and { layer: <key>, transparent: true, enabled: true } where it should draw.',
                'Physics: use3dPhysics and useLegacyAmmoPhysics are legacy asm.js Ammo loader flags and are not supported; setting either to true is rejected (clearing them is allowed). Enable physics with the Editor IMPORT AMMO button, which imports the Ammo WASM module asset.',
                'When NOT to use: to change per-scene settings like fog or gravity (use modify_scene_settings) or a single entity (use modify_entities).'
            ].join(' '),
            annotations: {
                title: 'Modify Project Settings',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                settings: z.record(z.unknown()).describe('Partial project settings to change (path/value pairs); only provided fields are modified')
            }
        },
        ({ settings }) => modify(wss, (root) => toEdits(root, expand(settings)))
    );

    server.registerTool(
        'query_project_settings',
        {
            description: [
                'Read the current project-wide settings (physics, rendering device, layers, loading screen, script loading order, input, resolution). Returns the full settings object.',
                'When NOT to use: to change settings (use modify_project_settings) or to read per-scene settings (use query_scene_settings).'
            ].join(' '),
            annotations: {
                title: 'Query Project Settings',
                readOnlyHint: true,
                openWorldHint: false
            }
        },
        () => {
            return wss.call('project:settings:query');
        }
    );

    server.registerTool(
        'query_settings',
        {
            description: [
                'Read any Editor settings scope: project, current scene, per-project user preferences (including editor.pipeline asset import defaults), global user preferences, session settings, or private project settings.',
                'Omit path for the complete scope or provide a dot path for one value.'
            ].join(' '),
            annotations: {
                title: 'Query Settings',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                scope: SettingsScopeSchema,
                path: z.string().min(1).optional()
            }
        },
        ({ scope, path }) => path === undefined ? wss.call('settings:query', scope) : wss.call('settings:query', scope, path)
    );

    server.registerTool(
        'modify_settings',
        {
            description: [
                'Set or unset arbitrary Editor settings by dot path in project, scene, projectUser, user, session, or projectPrivate scope.',
                'Asset import defaults are in projectUser under editor.pipeline.*. Project, scene, and private settings require project write access.',
                'Query the scope first to discover current paths and values.'
            ].join(' '),
            annotations: {
                title: 'Modify Settings',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: {
                scope: SettingsScopeSchema,
                edits: z.array(SettingEditSchema).nonempty()
            }
        },
        ({ scope, edits }) =>
            scope === 'project' && edits.some(({ path }) => path.split('.')[0] === 'layers')
                ? modify(wss, () => edits)
                : wss.call('settings:modify', scope, edits)
    );
};

export { SettingEditSchema, SettingsScopeSchema };
