import { Worker } from "node:worker_threads";
import { createWorker } from "@/utils/workerFactory.js";

class Thread<T, TArgs extends unknown[] = unknown[]> {
    private worker: Worker;
    private promise: Promise<T>;

    constructor(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs) {
        this.worker = createWorker();

        this.promise = new Promise<T>((resolve, reject) => {
            this.worker.on('message', (res: { success: boolean; result?: T; error?: string }) => {
                if (res.success) {
                    resolve(res.result as T);
                } else {
                    reject(new Error(res.error));
                }
            });
            this.worker.on('error', (err) => {
                reject(err);
            });
            this.worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });

        this.worker.postMessage({ fn: fn.toString(), args });
    }

    async join(): Promise<T> {
        try {
            const result = await this.promise;
            return result;
        } finally {
            this.worker.terminate();
        }
    }
}

export { Thread }