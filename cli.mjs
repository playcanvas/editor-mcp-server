#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

const options = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        defaultValue: false
    },
    {
        name: 'version',
        alias: 'v',
        type: Boolean,
        defaultValue: false
    },
    {
        name: 'port',
        alias: 'p',
        type: Number,
        defaultValue: 52000
    }
];

const help = commandLineUsage([{
    header: 'Usage',
    content: `npx ${pkg.name} [options]`
}, {
    header: 'Options',
    optionList: options
}]);

const main = (argv) => {
    const args = commandLineArgs(options, { argv });
    if (args.help) {
        console.log(help);
        return;
    }
    if (args.version) {
        console.log(`v${pkg.version}`);
        return;
    }

    process.env.PORT = args.port.toString();

    // Launch the server as a DIRECT child (`node --import tsx …`) instead of via
    // `npx tsx`, which inserts extra npx/tsx wrapper processes. A short, direct
    // chain means that if this launcher dies the server is reparented to init
    // (ppid 1) and can detect that and exit itself (see server.ts), instead of
    // lingering as an orphan that keeps hogging the port.
    const serverPath = resolve(__dirname, 'src', 'server.ts');
    const child = spawn(process.execPath, ['--import', 'tsx', serverPath], {
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
