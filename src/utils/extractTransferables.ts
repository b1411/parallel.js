import type { Transferable } from "node:worker_threads";

/** 
 * Extracts transferable objects from the given arguments.
 * Supports MessagePorts and ArrayBuffers (excluding SharedArrayBuffers).
 * 
 * @param args - The arguments to extract transferables from.
 * @returns An array of transferable objects.
*/
export const extractTransferables = <TArgs>(args: TArgs): Transferable[] => {
    const transferables: Set<Transferable> = new Set<Transferable>();

    const extract = (obj: unknown): void => {
        if (!obj) return;

        if (obj instanceof MessagePort) {
            transferables.add(obj);
        } else
            if (obj instanceof ArrayBuffer && !(obj instanceof SharedArrayBuffer)) {
                transferables.add(obj);
            } else if (ArrayBuffer.isView(obj)) {
                if (obj.buffer instanceof ArrayBuffer && !(obj.buffer instanceof SharedArrayBuffer)) {
                    transferables.add(obj.buffer);
                }
            } else if (Array.isArray(obj)) {
                obj.forEach(extract);
            } else if (typeof obj === 'object') {
                for (const o of Object.values(obj)) {
                    extract(o);
                }
            }
    };

    extract(args);
    return Array.from(transferables);
}