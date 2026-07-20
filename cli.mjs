#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

const HELP = `
Usage

  npx ${pkg.name} [options]

Options

  -h, --help       Show this help.
  -v, --version    Print the version.
  -p, --port <n>   WebSocket port the editor connects to (default: 52000).
`;

const main = (argv) => {
    let port = 52000;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            console.log(HELP);
            return;
        }
        if (arg === '-v' || arg === '--version') {
            console.log(`v${pkg.version}`);
            return;
        }
        if (arg === '-p' || arg === '--port' || arg.startsWith('--port=')) {
            port = parseInt(arg.includes('=') ? arg.split('=')[1] : argv[++i], 10);
            if (!Number.isInteger(port) || port < 1 || port > 65535) {
                console.error('Invalid port');
                process.exit(1);
            }
        }
    }

    process.env.PORT = port.toString();

    // Launch the server as a DIRECT child so that if this launcher dies the
    // server is reparented to init (ppid 1) and can detect that and exit
    // itself (see server.ts), instead of lingering as an orphan that keeps
    // hogging the port. The published package ships the bundled server; a
    // dev checkout runs the TypeScript source directly (native type
    // stripping, hence the Node 22.18+ requirement). src is never in the
    // published tarball (files: ["dist"]), so its presence means dev
    // checkout — always run live source, even if a stale dist/ exists
    // from a previous build.
    const src = resolve(__dirname, 'src', 'server.ts');
    const serverPath = existsSync(src) ? src : resolve(__dirname, 'dist', 'server.mjs');
    const child = spawn(process.execPath, [serverPath], {
        stdio: 'inherit',
        cwd: __dirname,
        env: process.env
    });

    const killChild = (signal) => {
        try {
            child.kill(signal);
        } catch {
            // Already gone.
        }
    };

    // Never let the server outlive this launcher.
    process.on('SIGINT', () => killChild('SIGINT'));
    process.on('SIGTERM', () => killChild('SIGTERM'));
    process.on('exit', () => killChild('SIGKILL'));

    child.on('error', (error) => {
        console.error('[CLI ERROR]', error.message);
        process.exit(1);
    });
    child.on('exit', (code, signal) => {
        process.exit(signal ? 1 : (code ?? 0));
    });
};

main(process.argv.slice(2));
