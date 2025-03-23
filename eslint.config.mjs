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
                ...globals.node
            }
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json'
                }
            }
        }
    }
];
