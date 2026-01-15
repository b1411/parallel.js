import { Worker, type Transferable } from "node:worker_threads";
import { createWorker } from "@/utils/workerFactory.js";
import { Queue } from "@datastructures-js/queue";
import { extractTransferables } from "@/utils/extractTransferables.js";

interface Task<T> {
    fn: string;
    args: unknown[];
    transferables?: Transferable[];
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
}

export class ThreadPool {
    private workers: Worker[] = [];
    private availableWorkers: Worker[] = [];
    private taskQueue = new Queue<Task<unknown>>();
    private workerTasks = new Map<Worker, Task<unknown>>();

    constructor(private size: number) {
        this.initWorkers();
    }

    private initWorkers() {
        for (let i = 0; i < this.size; i++) {
            const worker = createWorker();
            this.setupWorkerHandlers(worker.worker);
            this.workers.push(worker.worker);
            this.availableWorkers.push(worker.worker);
        }
    }

    private setupWorkerHandlers(worker: Worker) {
        worker.on('message', (res: { success: boolean; result?: unknown; error?: { message: string; stack?: string } }) => {
            const task = this.workerTasks.get(worker);
            if (!task) return;
            if (res.success) {
                task.resolve(res.result);
            } else {
                const error = new Error(res.error?.message || 'Unknown error');
                if (res.error?.stack) {
                    error.stack = res.error.stack;
                }
                task.reject(error);
            }

            this.workerTasks.delete(worker);
            this.availableWorkers.push(worker);
            this.processQueue();
        });

        worker.on('error', (err) => {
            const task = this.workerTasks.get(worker);
            if (task) {
                task.reject(err);
                this.workerTasks.delete(worker);
            }

            this.recoverWorker(worker);
        });
    }

    private recoverWorker(crashedWorker: Worker) {
        this.workers = this.workers.filter(worker => worker !== crashedWorker);
        this.availableWorkers = this.availableWorkers.filter(worker => worker !== crashedWorker);
        crashedWorker.terminate();

        const newWorker = createWorker();
        this.setupWorkerHandlers(newWorker.worker);
        this.workers.push(newWorker.worker);
        this.availableWorkers.push(newWorker.worker);
        this.processQueue();
    }

    private processQueue() {
        while (!this.taskQueue.isEmpty() && this.availableWorkers.length > 0) {
            const worker = this.availableWorkers.pop() as Worker;
            const task = this.taskQueue.dequeue() as Task<unknown>;

            this.workerTasks.set(worker, task);
            worker.postMessage({ fn: task.fn.toString(), args: task.args }, task.transferables || []);
        }
    }

    async execute<TArgs extends unknown[], TResult>(
        fn: (...args: TArgs) => TResult,
        args: TArgs = [] as unknown as TArgs
    ): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            const task: Task<unknown> = {
                fn: fn.toString(),
                args,
                transferables: extractTransferables(args),
                resolve: resolve as (value: unknown) => void,
                reject
            };
            this.taskQueue.enqueue(task);
            this.processQueue();
        });
    }

    async map<T, R>(items: T[], fn: (item: T) => R): Promise<R[]> {
        return Promise.all(
            items.map(item => this.execute<[T], R>(fn, [item]))
        ) as Promise<R[]>;
    }

    getStats() {
        return {
            totalWorkers: this.workers.length,
            availableWorkers: this.availableWorkers.length,
            busyWorkers: this.workers.length - this.availableWorkers.length,
            queuedTasks: this.taskQueue.size(),
        };
    }

    async terminate() {
        await Promise.all(
            this.workers.map(w => w.terminate())
        );
        this.workers = [];
        this.availableWorkers = [];
        this.taskQueue = new Queue<Task<unknown>>();
        this.workerTasks.clear();
    }
}