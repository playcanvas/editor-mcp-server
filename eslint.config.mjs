import typescriptConfig from '@playcanvas/eslint-config/typescript';

export default [
    ...typescriptConfig,
    {
        files: ['**/*.ts'],
        rules: {
            // sdk 1.29+ maps `./*` types to `*.js.d.ts`, which it doesn't ship; node, tsc and esbuild still resolve these
            'import-x/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }]
        }
    }
];
