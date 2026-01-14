import type { Transferable } from "node:worker_threads";

export const extractTransferables = <TArgs>(args: TArgs): Transferable[] => {
    const transferables: Transferable[] = [];

    const extract = (obj: unknown): void => {
        if (!obj) return;

        if (obj instanceof ArrayBuffer) {
            transferables.push(obj);
        } else if (ArrayBuffer.isView(obj)) {
            if (obj.buffer instanceof ArrayBuffer) {
                transferables.push(obj.buffer);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(extract);
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(extract);
        }
    };

    extract(args);
    return transferables;
}