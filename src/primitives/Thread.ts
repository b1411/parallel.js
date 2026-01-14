import { extractTransferables } from "@/utils/extractTransferables.js";
import { createWorker } from "@/utils/workerFactory.js";

class Thread<T, TArgs extends unknown[] = unknown[]> {
    private worker: ReturnType<typeof createWorker>;
    private promise: Promise<T>;

    constructor(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs) {
        this.worker = createWorker();

        this.promise = new Promise<T>((resolve, reject) => {
            this.worker.worker.on('message', (res: { success: boolean; result?: T; error?: string }) => {
                if (res.success) {
                    resolve(res.result as T);
                } else {
                    reject(new Error(res.error));
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