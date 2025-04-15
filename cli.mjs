#!/usr/bin/env node

import { execSync } from 'child_process';
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
    try {
        execSync(`npx tsx ${resolve(__dirname, 'src', 'server.ts')}`, {
            stdio: 'inherit',
            env: process.env
        });
    } catch (error) {
        console.error('[CLI ERROR]', error.message);
        process.exit(1);
    }
};

main(process.argv.slice(2));
