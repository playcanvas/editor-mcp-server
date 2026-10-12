import typescriptConfig from '@playcanvas/eslint-config/typescript';

export default [
    ...typescriptConfig,
    {
        // TypeScript files document with TSDoc: the compiler already carries the
        // types, so doc comments describe params/returns without duplicating them
        // as `{type}` annotations. Plain .js files keep the JSDoc `{type}` fields
        // (they have no inline-type alternative), so only relax the rule here.
        files: ['**/*.ts'],
        rules: {
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off',

            // sdk 1.29+ maps `./*` types to `*.js.d.ts`, which it doesn't ship; node, tsc and esbuild still resolve these
            'import-x/no-unresolved': ['error', { ignore: ['^@modelcontextprotocol/sdk/'] }]
        }
    }
];
