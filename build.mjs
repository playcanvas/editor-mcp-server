import { build } from 'esbuild';

// bundle everything (sdk, zod, ws) so the published package has zero runtime
// dependencies — npx installs are a single small tarball and start fast.
// bufferutil/utf-8-validate are optional native accelerators ws probes for
// via try/require; leave them external so the probe just fails gracefully.
await build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: 'dist/server.mjs',
    external: ['bufferutil', 'utf-8-validate'],
    banner: { js: 'import { createRequire } from \'module\'; const require = createRequire(import.meta.url);' }
});
