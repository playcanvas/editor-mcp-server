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

    server.registerTool(
        'get_checkpoint',
        {
            description: [
                'Get a single checkpoint by its id. Returns the checkpoint record ({ id, createdAt, description, user }).',
                'When NOT to use: to list a branch\'s checkpoints (use list_checkpoints).'
            ].join(' '),
            annotations: { title: 'Get Checkpoint', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                checkpointId: z.string().describe('Id of the checkpoint to get (from list_checkpoints)')
            }
        },
        ({ checkpointId }) => wss.call('vcs:checkpoint:get', { checkpointId })
    );

    server.registerTool(
        'close_branch',
        {
            description: [
                'Close a branch (a soft, reversible archive — reopen it later with open_branch).',
                'Cannot close the current branch or a permanent branch. Does not reload the editor.',
                'When NOT to use: to permanently remove a branch (use delete_branch).'
            ].join(' '),
            annotations: { title: 'Close Branch', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                branchId: z.string().describe('Id of the branch to close (from list_branches)')
            }
        },
        ({ branchId }) => wss.call('vcs:branch:close', { branchId })
    );

    server.registerTool(
        'open_branch',
        {
            description: [
                'Re-open a previously closed branch. Find closed branches with list_branches({ closed: true }). Does not reload the editor.',
                'When NOT to use: to switch the editor onto the branch (use switch_branch).'
            ].join(' '),
            annotations: { title: 'Open Branch', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                branchId: z.string().describe('Id of the closed branch to re-open (from list_branches with closed:true)')
            }
        },
        ({ branchId }) => wss.call('vcs:branch:open', { branchId })
    );

    server.registerTool(
        'delete_branch',
        {
            description: [
                'DESTRUCTIVE: permanently delete a branch and its checkpoints. Cannot be undone.',
                'Cannot delete the current branch or a permanent branch. Does not reload the editor.',
                'When NOT to use: to archive a branch reversibly (use close_branch).'
            ].join(' '),
            annotations: { title: 'Delete Branch', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                branchId: z.string().describe('Id of the branch to delete (from list_branches)')
            }
        },
        ({ branchId }) => wss.call('vcs:branch:delete', { branchId })
    );

    server.registerTool(
        'start_merge',
        {
            description: [
                'Start merging a source branch into the CURRENT branch (the destination is always the branch the editor is on).',
                'Waits for the auto-merge to finish and returns the merge ({ id, mergeProgressStatus, conflicts, numConflicts }). If conflicts is non-empty, resolve them with resolve_conflicts, then apply_merge.',
                'Does not reload the editor. When NOT to use: to inspect an in-progress merge (use get_merge).'
            ].join(' '),
            annotations: { title: 'Start Merge', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                sourceBranchId: z.string().describe('Id of the branch to merge into the current branch (from list_branches)'),
                closeSource: z.boolean().optional().describe('Close the source branch after the merge is finalized (default false)')
            }
        },
        ({ sourceBranchId, closeSource }) => wss.call('vcs:merge:create', { sourceBranchId, closeSource })
    );

    server.registerTool(
        'get_merge',
        {
            description: [
                'Get the current state of a merge, including its status and full conflict list ({ id, mergeProgressStatus, conflicts, numConflicts }).',
                'Use to re-check which conflicts are still unresolved before apply_merge. When NOT to use: to start a merge (use start_merge).'
            ].join(' '),
            annotations: { title: 'Get Merge', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                mergeId: z.string().describe('Id of the merge (from start_merge)')
            }
        },
        ({ mergeId }) => wss.call('vcs:merge:get', { mergeId })
    );

    server.registerTool(
        'resolve_conflicts',
        {
            description: [
                'Resolve one or more merge conflicts by picking a side, or revert them to unresolved.',
                'resolution "source" keeps the merged-in branch\'s version, "dest" keeps the current branch\'s version, "revert" un-resolves. Returns the updated conflict records.',
                'Repeat until get_merge shows no unresolved conflicts, then apply_merge. When NOT to use: to inspect a conflict\'s content first (use get_conflict_file).'
            ].join(' '),
            annotations: { title: 'Resolve Conflicts', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                mergeId: z.string().describe('Id of the merge (from start_merge)'),
                conflictIds: z.array(z.string()).min(1).describe('Ids of the conflicts to resolve (from the merge\'s conflicts list)'),
                resolution: z.enum(['source', 'dest', 'revert']).describe('"source" = keep the merged-in branch, "dest" = keep the current branch, "revert" = un-resolve')
            }
        },
        ({ mergeId, conflictIds, resolution }) => wss.call('vcs:conflict:resolve', { mergeId, conflictIds, resolution })
    );

    server.registerTool(
        'get_conflict_file',
        {
            description: [
                'Read the content of one side of a conflicting file so you can decide how to resolve it. Read-only; does not resolve anything.',
                'When NOT to use: to choose a resolution (use resolve_conflicts).'
            ].join(' '),
            annotations: { title: 'Get Conflict File', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                mergeId: z.string().describe('Id of the merge (from start_merge)'),
                conflictId: z.string().describe('Id of the conflict (from the merge\'s conflicts list)'),
                fileName: z.string().describe('Name of the conflicting file (from the conflict record)'),
                resolved: z.boolean().optional().describe('Fetch the resolved version instead of the original (default false)')
            }
        },
        ({ mergeId, conflictId, fileName, resolved }) => wss.call('vcs:conflict:getfile', { mergeId, conflictId, fileName, resolved })
    );

    server.registerTool(
        'apply_merge',
        {
            description: [
                'Apply a merge whose conflicts are all resolved. Call twice: first with finalize:false to prepare and review, then finalize:true to commit.',
                'finalize:true writes the merge checkpoint onto the current branch and RELOADS the editor (the tool waits for reconnect and returns vcs_status); finalize:false does not reload.',
                'When NOT to use: to abort a merge (use cancel_merge).'
            ].join(' '),
            annotations: { title: 'Apply Merge', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            inputSchema: {
                mergeId: z.string().describe('Id of the merge (from start_merge)'),
                finalize: z.boolean().describe('false = prepare and review the merge; true = commit it (only after a finalize:false pass and all conflicts resolved)')
            }
        },
        ({ mergeId, finalize }) => finalize
            ? withReload(wss, 'vcs:merge:apply', { mergeId, finalize: true })
            : wss.call('vcs:merge:apply', { mergeId, finalize: false })
    );

    server.registerTool(
        'cancel_merge',
        {
            description: [
                'Force-stop an in-progress merge, discarding the merge and its conflicts. Project data is untouched. Does not reload the editor.',
                'When NOT to use: to commit a merge (use apply_merge).'
            ].join(' '),
            annotations: { title: 'Cancel Merge', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            inputSchema: {
                mergeId: z.string().describe('Id of the merge to cancel (from start_merge)')
            }
        },
        ({ mergeId }) => wss.call('vcs:merge:delete', { mergeId })
    );

    server.registerTool(
        'diff_checkpoints',
        {
            description: [
                'Compute the diff between two checkpoints and return the change data. Branch ids default to the current branch. Read-only; does not reload the editor.',
                'Use to inspect what changed before merging or restoring. When NOT to use: to roll back to a checkpoint (use restore_checkpoint).'
            ].join(' '),
            annotations: { title: 'Diff Checkpoints', readOnlyHint: true, openWorldHint: false },
            inputSchema: {
                srcCheckpointId: z.string().describe('Id of the source (older) checkpoint'),
                dstCheckpointId: z.string().describe('Id of the destination (newer) checkpoint'),
                srcBranchId: z.string().optional().describe('Branch of the source checkpoint (defaults to the current branch)'),
                dstBranchId: z.string().optional().describe('Branch of the destination checkpoint (defaults to the current branch)')
            }
        },
        ({ srcCheckpointId, dstCheckpointId, srcBranchId, dstBranchId }) =>
            wss.call('vcs:diff', { srcCheckpointId, dstCheckpointId, srcBranchId, dstBranchId })
    );
};
