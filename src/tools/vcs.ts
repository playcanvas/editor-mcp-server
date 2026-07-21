import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

// how long to wait for the editor to reload and reconnect after a branch-changing op.
// the reconnect fires on the reloaded page's DOMContentLoaded (before assets stream in),
// so this scales with page render/network, not project size.
const RELOAD_WAIT_MS = 60_000;

// fire a branch-changing method, wait for the editor to reload+reconnect, then
// return fresh status — so the agent sees one clean call across the reload
const withReload = async (wss: WSS, method: string, ...args: unknown[]) => {
    const gen = wss.editorGeneration;
    const res = await wss.call(method, ...args);
    if (res.isError) {
        return res;
    }
    const back = await wss.waitForEditor(gen, RELOAD_WAIT_MS);
    if (!back) {
        return wss.fail(method, 'Operation issued but the editor did not reconnect in time. Check the editor is open and connected, then call vcs_status.');
    }
    return wss.call('vcs:status');
};

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'vcs_status',
        {
            description: [
                'Read the current version-control state: the active branch ({ id, name, latestCheckpointId }), the projectId, and whether a merge is in progress.',
                'Use this to confirm which branch you are on, especially after create_branch/switch_branch/restore_checkpoint/hard_reset_checkpoint (which reload the editor).',
                'When NOT to use: to list branches (use list_branches) or checkpoints (use list_checkpoints).'
            ].join(' '),
            annotations: { title: 'VCS Status', readOnlyHint: true, openWorldHint: false }
        },
        () => wss.call('vcs:status')
    );

    server.registerTool(
        'list_branches',
        {
            description: [
                'List the project\'s branches. Returns branch records ({ id, name, createdAt, closed, permanent, latestCheckpointId, user }).',
                'Paginates via limit + cursor (meta.nextCursor); set closed:true to include closed branches, favorite:true for your favourites.',
                'When NOT to use: to read the current branch (use vcs_status).'
            ].join(' '),
            annotations: { title: 'List Branches', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                limit: z.number().int().positive().optional().describe('Max branches to return'),
                cursor: z.string().optional().describe('Pagination cursor (a branch id from a previous meta.nextCursor)'),
                closed: z.boolean().optional().describe('Include closed branches'),
                favorite: z.boolean().optional().describe('List only your favourite branches')
            }
        },
        ({ limit, cursor, closed, favorite }) => wss.call('vcs:branch:list', { limit, cursor, closed, favorite })
    );

    server.registerTool(
        'create_branch',
        {
            description: [
                'Create a new branch (scope a feature on its own branch) and switch the editor to it. Branches from the current branch by default.',
                'This RELOADS the editor; the tool waits for it to reconnect and returns the resulting vcs_status on the new branch.',
                'Name must be unique in the project and at most 1000 characters. When NOT to use: to switch to an existing branch (use switch_branch).'
            ].join(' '),
            annotations: { title: 'Create Branch', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                name: z.string().min(1).max(1000).describe('Name for the new branch'),
                sourceBranchId: z.string().optional().describe('Branch to fork from (defaults to the current branch)'),
                sourceCheckpointId: z.string().optional().describe('Checkpoint on the source branch to fork from (defaults to its latest)')
            }
        },
        ({ name, sourceBranchId, sourceCheckpointId }) => withReload(wss, 'vcs:branch:create', { name, sourceBranchId, sourceCheckpointId })
    );

    server.registerTool(
        'switch_branch',
        {
            description: [
                'Switch (checkout) the editor to an existing branch by its id (from list_branches).',
                'This RELOADS the editor; the tool waits for it to reconnect and returns the resulting vcs_status on the target branch.',
                'When NOT to use: to create a new branch (use create_branch).'
            ].join(' '),
            annotations: { title: 'Switch Branch', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                branchId: z.string().describe('Id of the branch to switch to (the "id" field from list_branches)')
            }
        },
        ({ branchId }) => withReload(wss, 'vcs:branch:checkout', branchId)
    );

    server.registerTool(
        'list_checkpoints',
        {
            description: [
                'List checkpoints on a branch (the current branch by default), newest first. Returns records ({ id, createdAt, description, user }).',
                'Paginates via limit + cursor (meta.nextCursor); backend default limit 25, max 50. Use a checkpoint id with restore_checkpoint / hard_reset_checkpoint.',
                'When NOT to use: to list branches (use list_branches).'
            ].join(' '),
            annotations: { title: 'List Checkpoints', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                branchId: z.string().optional().describe('Branch to list checkpoints for (defaults to the current branch)'),
                limit: z.number().int().positive().max(50).optional().describe('Max checkpoints to return (max 50)'),
                cursor: z.string().optional().describe('Pagination cursor (a checkpoint id from a previous meta.nextCursor)')
            }
        },
        ({ branchId, limit, cursor }) => wss.call('vcs:checkpoint:list', { branchId, limit, cursor })
    );

    server.registerTool(
        'create_checkpoint',
        {
            description: [
                'Create a checkpoint (an immutable snapshot of the current branch\'s scenes/assets/settings) with a description. Returns the created checkpoint ({ id, createdAt, description }).',
                'Does not reload the editor. Snapshotting is asynchronous; for very large projects it may exceed the request timeout, in which case the checkpoint usually still completes — confirm with list_checkpoints.',
                'When NOT to use: to roll back to a checkpoint (use restore_checkpoint).'
            ].join(' '),
            annotations: { title: 'Create Checkpoint', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                description: z.string().min(1).max(10000).describe('Description of the checkpoint'),
                branchId: z.string().optional().describe('Branch to checkpoint (defaults to the current branch)')
            }
        },
        ({ description, branchId }) => wss.call('vcs:checkpoint:create', { description, branchId })
    );

    server.registerTool(
        'restore_checkpoint',
        {
            description: [
                'Restore (soft revert) the current branch\'s working state to a checkpoint. History is preserved — later checkpoints remain.',
                'This RELOADS the editor; the tool waits for it to reconnect and returns the resulting vcs_status.',
                'When NOT to use: to permanently erase later checkpoints (use hard_reset_checkpoint).'
            ].join(' '),
            annotations: { title: 'Restore Checkpoint', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                checkpointId: z.string().describe('Id of the checkpoint to restore (from list_checkpoints)'),
                branchId: z.string().optional().describe('Branch to restore on (defaults to the current branch)')
            }
        },
        ({ checkpointId, branchId }) => withReload(wss, 'vcs:checkpoint:restore', { checkpointId, branchId })
    );

    server.registerTool(
        'hard_reset_checkpoint',
        {
            description: [
                'DESTRUCTIVE: reset the branch head back to a checkpoint and PERMANENTLY ERASE every checkpoint created after it. Cannot be undone.',
                'This RELOADS the editor; the tool waits for it to reconnect and returns the resulting vcs_status.',
                'When NOT to use: to roll back working state while keeping history (use restore_checkpoint).'
            ].join(' '),
            annotations: { title: 'Hard Reset To Checkpoint', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                checkpointId: z.string().describe('Id of the checkpoint to hard reset to (from list_checkpoints); all later checkpoints are erased'),
                branchId: z.string().optional().describe('Branch to hard reset (defaults to the current branch)')
            }
        },
        ({ checkpointId, branchId }) => withReload(wss, 'vcs:checkpoint:hardreset', { checkpointId, branchId })
    );
};
