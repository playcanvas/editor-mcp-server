import { createDreams } from '@daydreamsai/core';
import { createMcpExtension } from '@daydreamsai/core/extensions';
import { LogLevel } from '@daydreamsai/core';
import path from 'path';
import { anthropic } from '@ai-sdk/anthropic';
import { cli } from '@daydreamsai/core/extensions';

// Disables logging of ctxState and agentCtxState
const log = console.log;
console.log = (...args) => {
    if (args[0] === 'ctxState' || args[0] === 'agentCtxState') {
        return;
    }
    log(...args);
}

createDreams({
  model: anthropic('claude-3-7-sonnet-latest'),
  logger: LogLevel.INFO,

  extensions: [
    cli,
    createMcpExtension([
      {
        id: 'playcanvas-server',
        name: 'PlayCanvas Server',
        transport: {
          type: 'stdio',
          command: 'node',
          args: [path.join(__dirname, 'server.mjs')],
        },
      },
    ]),
  ],
}).start();