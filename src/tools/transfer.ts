import { randomUUID } from 'node:crypto';
import { link, open, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import type { WSS } from '../wss.ts';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_CHUNK_BYTES = 1024 * 1024;
export const MAX_TRANSFER_BYTES = 512 * 1024 * 1024;

export const settle = <T>(promise: Promise<T>) =>
    promise.then((data) => [null, data] as const, (error) => [error, null] as const);

export const message = (error: unknown) => error instanceof Error ? error.message : String(error);

/**
 * Read a download transfer from the editor into a local file through an atomic temporary file.
 *
 * @param wss - The editor connection.
 * @param start - The editor method and arguments that start the transfer.
 * @param path - The local output path.
 * @param overwrite - Replace an existing file.
 * @returns An `[error, result]` tuple.
 */
export const readTransfer = async (
    wss: WSS,
    start: { method: string; args: unknown[] },
    path: string,
    overwrite?: boolean
) => {
    const output = resolve(path);
    if (!overwrite && await stat(output).then(() => true, () => false)) {
        return [`File already exists: ${output}. Set overwrite=true to replace it.`, null] as const;
    }
    const temp = join(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
    const [openError, file] = await settle(open(temp, 'wx'));
    if (openError || !file) {
        return [message(openError), null] as const;
    }

    let failure: unknown;
    let id: string | undefined;
    let filename: string | undefined;
    let mime: string | undefined;
    let size = 0;
    const [startError, reply] = await settle(wss.raw(start.method, ...start.args));
    if (startError || reply?.error) {
        failure = startError || new Error(reply?.error);
    } else {
        const data = reply?.data as {
            transferId?: string;
            size?: number;
            filename?: string;
            mime?: string;
            base64?: string;
        };
        id = data.transferId;
        filename = data.filename;
        mime = data.mime;
        size = data.size ?? -1;
        if (!Number.isInteger(size) || size < 0 || size > MAX_TRANSFER_BYTES) {
            failure = new Error('Editor returned an invalid or oversized download transfer.');
        } else if (typeof data.base64 === 'string') {
            if (
                data.base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 ||
                data.base64.length % 4 !== 0 ||
                !/^[a-z\d+/]*={0,2}$/i.test(data.base64)
            ) {
                failure = new Error('Editor returned invalid inline asset data.');
            } else {
                const bytes = Buffer.from(data.base64, 'base64');
                if (bytes.length !== size) {
                    failure = new Error('Editor returned an invalid inline asset length.');
                } else {
                    const [writeError, result] = await settle(file.write(bytes, 0, bytes.length, 0));
                    failure = writeError || (result?.bytesWritten !== bytes.length
                        ? new Error('Failed to write the complete asset.')
                        : null);
                }
            }
        } else if (!id) {
            failure = new Error('Editor returned an invalid download transfer.');
        } else {
            let offset = 0;
            while (!failure && offset < size) {
                const [readError, raw] = await settle(
                    wss.raw('files:download:read', id, offset, Math.min(MAX_CHUNK_BYTES, size - offset))
                );
                if (readError || raw?.error) {
                    failure = readError || new Error(raw?.error);
                    break;
                }
                const chunk = raw?.data as { offset?: number; base64?: string };
                if (
                    typeof chunk?.base64 !== 'string' ||
                    chunk.base64.length > Math.ceil(MAX_CHUNK_BYTES / 3) * 4 ||
                    chunk.base64.length % 4 !== 0 ||
                    !/^[a-z\d+/]*={0,2}$/i.test(chunk.base64)
                ) {
                    failure = new Error(`Editor returned an invalid download chunk at byte ${offset}.`);
                    break;
                }
                const bytes = Buffer.from(chunk.base64, 'base64');
                if (!bytes.length || bytes.length > MAX_CHUNK_BYTES || chunk.offset !== offset + bytes.length) {
                    failure = new Error(`Editor returned an invalid download offset at byte ${offset}.`);
                    break;
                }
                const [writeError, result] = await settle(file.write(bytes, 0, bytes.length, offset));
                if (writeError || result?.bytesWritten !== bytes.length) {
                    failure = writeError || new Error(`Failed to write the download chunk at byte ${offset}.`);
                    break;
                }
                offset += bytes.length;
            }
            if (!failure) {
                const [finishError, finish] = await settle(wss.raw('files:transfer:finish', id));
                failure = finishError || (finish?.error ? new Error(finish.error) : null);
            }
        }
    }

    const [closeError] = await settle(file.close());
    failure ||= closeError;
    if (failure) {
        if (id) {
            await settle(wss.raw('files:transfer:cancel', id));
        }
        await settle(unlink(temp));
        return [message(failure), null] as const;
    }

    const [moveError] = overwrite ? await settle(rename(temp, output)) : await settle(link(temp, output));
    if (moveError) {
        await settle(unlink(temp));
        return [message(moveError), null] as const;
    }
    if (!overwrite) {
        await settle(unlink(temp));
    }
    return [null, { path: output, filename, mime, bytes: size }] as const;
};
