#!/usr/bin/env tsx

import commandLineArgs from 'command-line-args';

const main = async (argv: string[]) => {
    const args = commandLineArgs([
        { name: 'port', alias: 'p', type: Number, defaultValue: 52000 }
    ], { argv });
    process.env.PORT = args.port.toString();
    await import('./server');
};

main(process.argv.slice(2));
