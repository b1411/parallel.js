import { extractTransferables } from "@/utils/extractTransferables.js";
import { BaseThread } from "./BaseThread.js";
import type { WorkerResponse } from "@/types.js";

/**
 * Thread for executing a function once in a worker thread or process.
 * Supports time-to-live (TTL) for automatic termination after a specified duration.
 * Returns a promise that resolves with the function's result or rejects on error.
 */
export class ExecutableThread<T, TArgs extends unknown[] = unknown[]> extends BaseThread {
    private promise: Promise<T>;
    private ttlTimeout: NodeJS.Timeout | null = null;
    private rejectFn: ((reason: Error) => void) | null = null;
    private messageHandler: ((res: WorkerResponse) => void) | null = null;
    private errorHandler: ((err: unknown) => void) | null = null;
    private exitHandler: ((code: number) => void) | null = null;

    constructor(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs, ttl = 0) {
        super();
        this.promise = new Promise<T>((resolve, reject) => {
            this.rejectFn = reject;

            this.messageHandler = (res: WorkerResponse) => {
                this.clearTTL();

                if ('success' in res && res.success) {
                    resolve(res.result as T);
                } else if ('success' in res && !res.success) {
                    const error = new Error(res.error.message || 'Unknown error');
                    if (res.error.stack) {
                        error.stack = res.error.stack;
                    }
                    reject(error);
                } else if ('type' in res && res.type === 'error') {
                    const error = new Error(res.error.message || 'Unknown error');
                    if (res.error.stack) {
                        error.stack = res.error.stack;
                    }
                    reject(error);
                }
            };

            this.errorHandler = (err) => {
                this.clearTTL();
                reject(err);
            };

            this.exitHandler = (code) => {
                this.clearTTL();
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            };

            this.worker.on('message', this.messageHandler);
            this.worker.on('error', this.errorHandler);
            this.worker.on('exit', this.exitHandler);
        });

        this.worker.postMessage({
            type: 'execute',
            fn: fn.toString(),
            args
        }, extractTransferables(args));

        if (ttl > 0) {
            this.ttlTimeout = setTimeout(() => {
                this.terminate();
                this.rejectFn?.(new Error('Thread TTL expired'));
            }, ttl);
        }
    }

    private clearTTL() {
        if (this.ttlTimeout) {
            clearTimeout(this.ttlTimeout);
            this.ttlTimeout = null;
        }
    }

    async join(): Promise<T> {
        try {
            const result = await this.promise;
            return result;
        } finally {
            this.cleanupListeners();
            this.returnToPool();
        }
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
        if (this.exitHandler) {
            this.worker.off('exit', this.exitHandler);
            this.exitHandler = null;
        }
    }
}