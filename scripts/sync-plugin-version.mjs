import { readFileSync, writeFileSync } from 'node:fs';

const STABLE = /^\d+\.\d+\.\d+$/;
const PIN = /(@playcanvas\/editor-mcp-server@)\d[^\s"`]*/g;
const FILES = {
    'plugin/.claude-plugin/plugin.json': /("version":\s*")[^"]+/,
    'plugin/.mcp.json': PIN,
    'plugin/README.md': PIN
};

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const check = process.argv.includes('--check');

// prereleases leave the plugin on the last stable version, so its pins only have to agree
if (check && version.includes('-')) {
    const pins = Object.entries(FILES).flatMap(([file, re]) => {
        const found = [...readFileSync(file, 'utf8').matchAll(new RegExp(re.source, 'g'))];
        return found.length ? found.map(m => [file, m[0].slice(m[1].length)]) : [[file, undefined]];
    });
    const [[, pin]] = pins;
    if (!STABLE.test(pin) || pins.some(([, p]) => p !== pin)) {
        console.error(`package version ${version} is a prerelease, so every plugin pin must be the same stable version:`);
        for (const [file, p] of pins) console.error(`  ${file}: ${p ?? 'no version'}`);
        process.exit(1);
    }
    console.log(`package version ${version} is a prerelease, plugin stays pinned to ${pin}`);
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
