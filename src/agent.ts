import path from 'path';

import { anthropic } from '@ai-sdk/anthropic';
import { LogLevel, createDreams } from '@daydreamsai/core';
import { createMcpExtension, cli } from '@daydreamsai/core/extensions';
import * as dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// HACK: Disable logging of ctxState and agentCtxState
const log = console.log;
console.log = (...args) => {
    if (args[0] === 'ctxState' || args[0] === 'agentCtxState') {
        return;
    }
    log(...args);
};

createDreams({
    model: anthropic('claude-3-7-sonnet-latest'),
    logger: LogLevel.INFO,

    extensions: [
        cli,
        createMcpExtension([
            {
                id: 'playcanvas-server',
                name: 'PlayCanvas MCP Server',
                transport: {
                    type: 'stdio',
                    command: 'tsx',
                    args: [path.join(__dirname, 'server.ts')]
                }
            }
        ])
    ]
}).start();
