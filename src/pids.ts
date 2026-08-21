/**
 * Deduped PIDs *listening* on `port`, parsed from raw lsof/netstat output. On Windows
 * netstat also lists the port's client rows (ESTABLISHED/TIME_WAIT), so only LISTENING
 * rows for the port are kept — else reclaiming the port would kill innocent clients
 * (e.g. the browser). PID 0 is skipped.
 */
export const parsePids = (output: string, platform: NodeJS.Platform, port: number) => {
    const lines = output.split('\n');
    const pids = platform === 'win32' ?
        lines
            .map(l => l.trim().split(/\s+/)) // Proto Local Foreign State PID
            .filter(c => c.length >= 5 && c[3] === 'LISTENING' && c[1].endsWith(`:${port}`))
            .map(c => c[4]) :
        lines.map(l => l.trim()); // lsof -t already filtered to LISTEN: one PID per line
    return Array.from(new Set(pids.filter(p => /^\d+$/.test(p) && p !== '0')));
};
