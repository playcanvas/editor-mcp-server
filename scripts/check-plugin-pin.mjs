import { readFileSync } from 'node:fs';

const STABLE = /^\d+\.\d+\.\d+$/;
const PKG = '@playcanvas/editor-mcp-server@';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const { version } = JSON.parse(read('package.json'));
const args = JSON.parse(read('plugin/.mcp.json')).mcpServers.playcanvas.args;
const readme = [...read('plugin/README.md').matchAll(/editor-mcp-server@(\S+)/g)].map(m => m[1]);

const pins = [
    ['plugin/.claude-plugin/plugin.json', JSON.parse(read('plugin/.claude-plugin/plugin.json')).version],
    ['plugin/.mcp.json', args.find(arg => arg.startsWith(PKG))?.slice(PKG.length)],
    ...(readme.length ? readme : [undefined]).map(pin => ['plugin/README.md', pin])
];

// prereleases leave the plugin on the last stable release
if (STABLE.test(version)) {
    const bad = pins.filter(([, pin]) => pin !== version);
    for (const [file, pin] of bad) {
        console.error(`${file} pins ${pin ?? 'no version'}, expected ${version} from package.json`);
    }
    if (bad.length) process.exit(1);
} else if (!pins.every(([, pin]) => pin === pins[0][1] && STABLE.test(pin))) {
    console.error(`package.json is prerelease ${version}, so every plugin pin must be the same stable version:`);
    for (const [file, pin] of pins) {
        console.error(`  ${file}: ${pin ?? 'no version'}`);
    }
    process.exit(1);
}

console.log(`plugin pinned to ${pins[0][1]} (package.json ${version})`);
