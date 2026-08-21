import assert from 'node:assert';
import { test } from 'node:test';

import { parsePids } from '../src/pids.ts';

const PORT = 52000;

// netstat dump with client rows (ESTABLISHED/TIME_WAIT), PID 0, and the real listener
const NETSTAT = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    127.0.0.1:49176        127.0.0.1:52000        TIME_WAIT       0
  TCP    127.0.0.1:51008        127.0.0.1:52000        ESTABLISHED     26960
  TCP    127.0.0.1:52000        0.0.0.0:0              LISTENING       6612
  TCP    127.0.0.1:52000        127.0.0.1:51008        ESTABLISHED     6612
  TCP    [::]:52000             [::]:0                 LISTENING       6612
  TCP    127.0.0.1:5200         0.0.0.0:0              LISTENING       999
`;

test('parsePids (win32) keeps only the LISTENING owner of the port', () => {
    // 6612 is the sole listener (deduped IPv4+IPv6); excludes Chrome 26960, PID 0, :5200
    assert.deepEqual(parsePids(NETSTAT, 'win32', PORT), ['6612']);
});

test('parsePids (win32) returns empty when nothing listens on the port', () => {
    assert.deepEqual(parsePids(NETSTAT, 'win32', 40000), []);
});

test('parsePids (posix) takes lsof -t PIDs one per line and dedupes', () => {
    // lsof -sTCP:LISTEN -t already filters to listeners: bare PIDs, one per line.
    assert.deepEqual(parsePids('6612\n6612\n0\n', 'darwin', PORT), ['6612']);
    assert.deepEqual(parsePids('', 'darwin', PORT), []);
});
