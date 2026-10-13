import type { WSS } from '../wss.ts';

// how long to wait for the editor to reload and reconnect after a reloading op.
// the reconnect fires on the reloaded page's DOMContentLoaded (before assets stream in),
// so this scales with page render/network, not project size.
const RELOAD_WAIT_MS = 60_000;

/**
 * Fire a method that reloads the editor, wait for it to reconnect, then return the follow-up
 * query, so the agent sees one clean call across the reload.
 *
 * @param wss - The websocket bridge.
 * @param follow - The follow-up method and the tool to suggest if the editor never returns.
 * @param follow.method - The method queried on the reconnected editor.
 * @param follow.tool - The tool that runs the same query.
 * @param method - The reloading method.
 * @param args - Its arguments.
 * @param waitMs - How long to wait for the reconnect.
 * @returns The follow-up query's response, or an error if the editor didn't reconnect.
 */
const withReload = async (wss: WSS, follow: { method: string; tool: string }, method: string, args: unknown[], waitMs = RELOAD_WAIT_MS) => {
    const gen = wss.editorGeneration;
    const res = await wss.call(method, ...args);
    if (res.isError) {
        return res;
    }
    const back = await wss.waitForEditor(gen, waitMs);
    if (!back) {
        return wss.fail(method, `Operation issued but the editor did not reconnect in time. Check the editor is open and connected, then call ${follow.tool}.`);
    }
    return wss.call(follow.method);
};

export { withReload, RELOAD_WAIT_MS };
