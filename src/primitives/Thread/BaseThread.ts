import { createWorker } from "@/utils/workerFactory.js";
import { availableParallelism } from "node:os";
import type { Worker } from "node:worker_threads";

export abstract class BaseThread {
    protected worker: Worker;
    protected terminated = false;

    constructor() {
        if (BaseThread.usePool && BaseThread.workerPool.length > 0) {
            this.worker = BaseThread.workerPool.pop() as Worker;
        } else {
            this.worker = createWorker();
        }
    }

    private static workerPool: Worker[] = [];
    private static usePool = false;

    static prewarm(count = availableParallelism() - 1) {
        this.usePool = true;
        for (let i = 0; i < count; i++) {
            const worker = createWorker();
            this.workerPool.push(worker);
        }
    }

    static clearPool() {
        for (const worker of this.workerPool) {
            worker.terminate();
        }
        this.workerPool = [];
        this.usePool = false;
    }

    protected returnToPool() {
        if (!this.terminated && BaseThread.usePool) {
            BaseThread.workerPool.push(this.worker);
            this.terminated = true;
        } else {
            this.terminate();
        }
    }

    terminate() {
        if (!this.terminated) {
            this.worker.terminate();
            this.terminated = true;
        }
    }
}