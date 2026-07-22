import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { WSS } from '../wss.ts';

const BUILD_TIMEOUT_MS = 10 * 60_000;
const POLL_MS = 2_000;
const IdSchema = z.number().int().positive();

type BuildStart = {
    id?: number;
    build_job_id?: number;
    result?: { id?: number };
};
type Artifact = { type: string; url: string };
type Build = { status?: string; message?: string; artifacts?: Artifact[] };

const fields = {
    name: z.string().min(1).max(1000),
    sceneIds: z
        .array(IdSchema)
        .nonempty()
        .describe('Scene ids in the designated project'),
    primarySceneId: IdSchema.optional().describe(
        'Primary scene; must also be in sceneIds'
    ),
    engineVersion: z
        .string()
        .optional()
        .describe(
            'Configured engine channel or exact available engine version'
        ),
    concatenate: z.boolean().optional(),
    minify: z.boolean().optional(),
    sourceMaps: z.boolean().optional(),
    optimizeSceneFormat: z.boolean().optional()
};

const sleep = () => new Promise((resolve) => setTimeout(resolve, POLL_MS));
const raw = (wss: WSS, name: string, ...args: unknown[]) =>
    wss.raw(name, ...args).catch((err) => ({
        data: undefined,
        error: err instanceof Error ? err.message : String(err)
    }));

export const register = (server: McpServer, wss: WSS) => {
    server.registerTool(
        'list_builds',
        {
            description:
                'List publish and download builds for the designated project, including durable job status and artifacts.',
            annotations: {
                title: 'List Builds',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: {
                limit: z.number().int().min(1).max(500).optional(),
                cursor: z.string().regex(/^\d+$/).optional(),
                type: z.enum(['publish', 'download']).optional(),
                status: z.enum(['complete', 'running', 'error']).optional(),
                format: z.enum(['playcanvas', 'static', 'npm']).optional(),
                branch: z.string().optional(),
                actor: z.string().optional()
            }
        },
        ({ limit, cursor, ...filters }) =>
            wss.call('builds:list', { limit, cursor, filters })
    );

    server.registerTool(
        'get_build',
        {
            description:
                'Get a publish or download build job by id from the designated project.',
            annotations: {
                title: 'Get Build',
                readOnlyHint: true,
                openWorldHint: false
            },
            inputSchema: { buildId: z.number().int().positive() }
        },
        ({ buildId }) => wss.call('builds:get', buildId)
    );

    server.registerTool(
        'create_build',
        {
            description:
                'Create a published PlayCanvas build for scenes in the designated project. Returns the created durable build job.',
            annotations: {
                title: 'Create Build',
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false
            },
            inputSchema: {
                ...fields,
                description: z.string().max(10000).optional(),
                version: z.string().max(20).optional(),
                releaseNotes: z.string().max(10000).optional()
            }
        },
        (options) => wss.call('builds:create', options)
    );

    server.registerTool(
        'download_build',
        {
            description:
                'Create a static or NPM download build, wait for its artifact, and save the archive to an explicit local path. Existing files are not overwritten unless overwrite=true.',
            annotations: {
                title: 'Download Build',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: true
            },
            inputSchema: {
                ...fields,
                format: z.enum(['static', 'npm']),
                outputPath: z.string().min(1),
                overwrite: z.boolean().optional()
            }
        },
        async ({ outputPath, overwrite, ...options }) => {
            const started = await raw(wss, 'builds:download', options);
            if (started.error) {
                return wss.fail('builds:download', started.error);
            }
            const data = started.data as BuildStart | undefined;
            const id = data?.id ?? data?.build_job_id ?? data?.result?.id;
            if (!id) {
                return wss.fail(
                    'builds:download',
                    'The build started but returned no build id. Use list_builds to inspect its status.'
                );
            }
            const deadline = Date.now() + BUILD_TIMEOUT_MS;
            let build: Build | undefined;
            while (Date.now() < deadline) {
                const current = await raw(wss, 'builds:get', id);
                if (current.error) {
                    return wss.fail('builds:download', current.error);
                }
                build = current.data as Build;
                if (build?.status === 'complete' || build?.status === 'error') {
                    break;
                }
                await sleep();
            }
            if (build?.status === 'error') {
                return wss.fail(
                    'builds:download',
                    build.message || `Build ${id} failed.`
                );
            }
            if (build?.status !== 'complete') {
                return wss.fail(
                    'builds:download',
                    `Build ${id} is still running after 10 minutes. Use get_build to inspect it.`
                );
            }
            const artifact =
                build.artifacts?.find((item) => item.type === 'download') ||
                build.artifacts?.[0];
            if (!artifact?.url) {
                return wss.fail(
                    'builds:download',
                    `Build ${id} completed without a download artifact.`
                );
            }
            const response = await fetch(artifact.url).catch((err) =>
                err instanceof Error ? err : new Error(String(err))
            );
            if (response instanceof Error) {
                return wss.fail('builds:download', response.message);
            }
            if (!response.ok) {
                return wss.fail(
                    'builds:download',
                    `Artifact download failed (${response.status} ${response.statusText}).`
                );
            }
            const path = resolve(outputPath);
            const bytes = new Uint8Array(await response.arrayBuffer());
            const error = await writeFile(path, bytes, {
                flag: overwrite ? 'w' : 'wx'
            }).then(
                () => null,
                (err) => (err instanceof Error ? err : new Error(String(err)))
            );
            if (error) {
                return wss.fail('builds:download', error.message);
            }
            return wss.ok('builds:download', {
                buildId: Number(id),
                path,
                bytes: bytes.byteLength
            });
        }
    );

    server.registerTool(
        'delete_build',
        {
            description:
                'Permanently delete a build job and its linked artifact from the designated project.',
            annotations: {
                title: 'Delete Build',
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false
            },
            inputSchema: { buildId: z.number().int().positive() }
        },
        ({ buildId }) => wss.call('builds:delete', buildId)
    );
};
