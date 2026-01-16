import type { WorkerResponse } from "@/types.js";
import { BaseThread } from "./BaseThread.js";
import { extractTransferables } from "@/utils/extractTransferables.js";

export class PersistentThread<T, TArgs extends unknown[] = unknown[]> extends BaseThread {
    private errorHandlers: ((error: Error) => void)[] = [];
    private messageHandler: ((res: WorkerResponse) => void) | null = null;
    private errorHandler: ((err: Error) => void) | null = null;

    constructor(
        fn: (...args: TArgs) => T,
        args: TArgs = [] as unknown as TArgs
    ) {
        super();

        this.messageHandler = (res: WorkerResponse) => {
            if ('type' in res && res.type === 'error') {
                const error = new Error(res.error?.message || 'Unknown error');
                if (res.error?.stack) {
                    error.stack = res.error.stack;
                }
                this.handleError(error);
            }
        };

        this.errorHandler = (err) => {
            this.handleError(err instanceof Error ? err : new Error(String(err)));
        };

        this.worker.on('message', this.messageHandler);
        this.worker.on('error', this.errorHandler);

        this.worker.postMessage({
            type: 'persistent',
            fn: fn.toString(),
            args
        }, extractTransferables(args));
    }

    onError(callback: (error: Error) => void): this {
        this.errorHandlers.push(callback)
        return this
    }

    private handleError(err: Error) {
        if (this.errorHandlers.length > 0) {
            this.errorHandlers.forEach(h => h(err))
        } else {
            console.error('Unhandled persistent error:', err)
        }
    }

    terminate(): void {
        this.cleanupListeners();
        super.terminate();
    }

    private cleanupListeners() {
        if (this.messageHandler) {
            this.worker.off('message', this.messageHandler);
            this.messageHandler = null;
        }
        if (this.errorHandler) {
            this.worker.off('error', this.errorHandler);
            this.errorHandler = null;
        }
    }
}   