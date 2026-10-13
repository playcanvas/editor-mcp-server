import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

import { RELOAD_WAIT_MS, withReload } from './reload.ts';

const PROJECT = { method: 'project:get', tool: 'get_project' };

const ProjectIdSchema = z.number().int().positive();

const raw = (wss: WSS, name: string, ...args: unknown[]) =>
    wss.raw(name, ...args).catch((err: Error) => ({ error: err.message, data: undefined, meta: undefined }));

// opening the already-open project would never reload, so the reconnect wait would time out
const openProject = async (wss: WSS, projectId: number, waitMs: number) => {
    const current = await raw(wss, 'project:get');
    if ((current.data as { id?: number } | undefined)?.id === projectId) {
        return wss.call('project:get');
    }
    return withReload(wss, PROJECT, 'project:open', [projectId], waitMs);
};

export const register = (server: McpServer, wss: WSS, reloadWaitMs = RELOAD_WAIT_MS) => {
    server.registerTool(
        'list_projects',
        {
            description: [
                'List the signed-in user\'s projects (or an organization\'s, by ownerId) as summaries: { id, name, description, private, owner, ownerId, modified }.',
                'Works from the Editor\'s project manager (/editor) with no project open. Use an id with open_project or get_project.',
                'When NOT to use: to read the open project (use get_project with no projectId).'
            ].join(' '),
            annotations: { title: 'List Projects', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                ownerId: ProjectIdSchema.optional().describe('User or organization id whose projects to list (defaults to you)')
            }
        },
        ({ ownerId }) => (ownerId === undefined ? wss.call('project:list') : wss.call('project:list', ownerId))
    );

    server.registerTool(
        'get_project',
        {
            description: [
                'Read one project\'s summary ({ id, name, description, private, owner, ownerId, modified, open }). Omit projectId for the project open in the Editor.',
                'Errors if no projectId is given and no project is open.',
                'When NOT to use: to read project settings like physics or rendering (use query_project_settings).'
            ].join(' '),
            annotations: { title: 'Get Project', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                projectId: ProjectIdSchema.optional().describe('Project id (defaults to the open project)')
            }
        },
        ({ projectId }) => (projectId === undefined ? wss.call('project:get') : wss.call('project:get', projectId))
    );

    server.registerTool(
        'open_project',
        {
            description: [
                'Open a project in the connected Editor tab by id (from list_projects or create_project).',
                'This RELOADS the tab into that project; the tool waits for the Editor to reconnect and returns get_project for the newly open project. Opening the project that is already open does nothing.',
                'When NOT to use: to switch branches within the open project (use switch_branch).'
            ].join(' '),
            annotations: { title: 'Open Project', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                projectId: ProjectIdSchema.describe('Id of the project to open')
            }
        },
        ({ projectId }) => openProject(wss, projectId, reloadWaitMs)
    );

    server.registerTool(
        'create_project',
        {
            description: [
                'Create a new blank project on your account (or an organization you belong to, via its username in owner) and return its summary.',
                'Only name, description, private and owner can be set. Set open:true to also open it in the Editor (RELOADS the tab, waits for the reconnect, returns get_project).',
                'If the backend is still setting the project up, meta.initializing is true and it is not opened; call open_project shortly after.',
                'When NOT to use: to rename or change an existing project (use update_project).'
            ].join(' '),
            annotations: { title: 'Create Project', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                name: z.string().min(1).describe('Project name'),
                description: z.string().optional().describe('Project description'),
                private: z.boolean().optional().describe('Make the project private (depends on your plan)'),
                owner: z.string().min(1).optional().describe('Username of the user or organization to own the project (defaults to you)'),
                open: z.boolean().optional().describe('Open the new project in the Editor once it is ready')
            }
        },
        async ({ open, ...fields }) => {
            const res = await raw(wss, 'project:create', fields);
            if (res.error) {
                return wss.fail('project:create', res.error);
            }
            const project = res.data as { id: number };
            if (!open || res.meta?.initializing) {
                return wss.ok('project:create', project, { ...res.meta, opened: false });
            }
            return openProject(wss, project.id, reloadWaitMs);
        }
    );

    server.registerTool(
        'update_project',
        {
            description: [
                'Change a project\'s name, description or visibility (private). Requires admin access to the project; plan limits on private projects apply.',
                'Returns the updated summary. When NOT to use: to change project settings like physics or rendering (use modify_project_settings).'
            ].join(' '),
            annotations: { title: 'Update Project', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                projectId: ProjectIdSchema.describe('Id of the project to update'),
                name: z.string().min(1).optional().describe('New project name'),
                description: z.string().optional().describe('New project description'),
                private: z.boolean().optional().describe('Make the project private or public')
            }
        },
        ({ projectId, ...fields }) => wss.call('project:update', projectId, fields)
    );
};
