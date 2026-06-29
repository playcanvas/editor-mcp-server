import playcanvasConfig from '@playcanvas/eslint-config';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    ...playcanvasConfig,
    {
        files: ['**/*.ts', '**/*.mjs', '**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: typescriptParser,
            parserOptions: {
                requireConfigFile: false
            },
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.node,
                ...globals.webextensions
            }
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json'
                }
            }
        },
        rules: {
            // We document with TSDoc, not JSDoc: TypeScript already carries the
            // types, so doc comments describe params/returns without duplicating
            // them as `{type}` annotations.
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off'
        }
    }
];
