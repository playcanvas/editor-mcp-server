import { readFileSync, writeFileSync } from 'node:fs';

const PIN = /(@playcanvas\/editor-mcp-server@)\d[^\s"`]*/g;
const FILES = {
    'plugin/.claude-plugin/plugin.json': /("version":\s*")[^"]+/,
    'plugin/.mcp.json': PIN,
    'plugin/README.md': PIN
};

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const check = process.argv.includes('--check');

// prereleases leave the plugin on the last stable version
if (check && version.includes('-')) {
    console.log(`package version ${version} is a prerelease, skipped plugin pin check`);
    process.exit(0);
}

const stale = [];
for (const [file, re] of Object.entries(FILES)) {
    const src = readFileSync(file, 'utf8');
    if (!src.match(re)) throw new Error(`no version pin in ${file}`);
    const out = src.replace(re, `$1${version}`);
    if (out === src) continue;
    stale.push(file);
    if (!check) writeFileSync(file, out);
}

if (check && stale.length) {
    console.error(`package version ${version} differs from ${stale.join(', ')}`);
    process.exit(1);
}

console.log(stale.length ? `synced plugin version to ${version}` : `plugin version matches ${version}`);
