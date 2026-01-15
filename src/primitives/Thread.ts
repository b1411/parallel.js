import { extractTransferables } from "@/utils/extractTransferables.js";
import { createWorker } from "@/utils/workerFactory.js";

class Thread<T, TArgs extends unknown[] = unknown[]> {
    private worker: ReturnType<typeof createWorker>;
    private promise: Promise<T>;

    constructor(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs) {
        this.worker = createWorker();

        this.promise = new Promise<T>((resolve, reject) => {
            this.worker.worker.on('message', (res: { success: boolean; result?: T; error?: { message: string; stack?: string } }) => {
                if (res.success) {
                    resolve(res.result as T);
                } else {
                    const error = new Error(res.error?.message || 'Unknown error');
                    if (res.error?.stack) {
                        error.stack = res.error.stack;
                    }
                    reject(error);
                }
            });
            this.worker.worker.on('error', (err) => {
                reject(err);
            });
            this.worker.worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });

        const transferables = extractTransferables(args);

        this.worker.run(fn, args, transferables);
    }

    async join(): Promise<T> {
        try {
            const result = await this.promise;
            return result;
        } finally {
            this.worker.worker.terminate();
        }
    }
}

export { Thread }