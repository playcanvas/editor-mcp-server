import typescriptConfig from '@playcanvas/eslint-config/typescript';
import globals from 'globals';

export default [
    ...typescriptConfig,
    {
        files: ['**/*.ts', '**/*.mjs', '**/*.js'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.node,
                ...globals.webextensions
            }
        }
    }
];
