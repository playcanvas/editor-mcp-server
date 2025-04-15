#!/usr/bin/env tsx

import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';

import pkg from '../package.json';

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
        defaultValue: false
    }
];

const help = commandLineUsage([{
    header: 'Usage',
    content: `npx ${pkg.name} [options]`
}, {
    header: 'Options',
    optionList: options
}]);

const main = async (argv: string[]) => {
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
    await import('./server');
};

main(process.argv.slice(2));
