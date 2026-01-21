import { Worker, type Transferable } from "node:worker_threads";
import { createWorker } from "@/utils/workerFactory.js";
import { Queue } from "@/datastructures/Queue.js";
import { extractTransferables } from "@/utils/extractTransferables.js";

interface Task<T> {
    fn: string;
    args: unknown[];
    transferables?: Transferable[];
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    ttlTimeout?: NodeJS.Timeout;
    cancelled?: boolean;
}

/**
 * ThreadPool for managing a pool of worker threads to execute tasks concurrently.
 * Supports task queuing, TTL for tasks, and automatic recovery of crashed workers.
 * Provides methods to execute functions and map over arrays using the pool.
 */
export class ThreadPool {
    private workers: Worker[] = [];
    private availableWorkers: Worker[] = [];
    private taskQueue = new Queue<Task<unknown>>();
    private workerTasks = new Map<Worker, Task<unknown>>();
    private defaultTTL: number | undefined;

    constructor(private size: number, ttl?: number) {
        this.defaultTTL = ttl;
        this.initWorkers();
    }

    private initWorkers() {
        for (let i = 0; i < this.size; i++) {
            const worker = createWorker();
            this.setupWorkerHandlers(worker);
            this.workers.push(worker);
            this.availableWorkers.push(worker);
        }
    }

    private setupWorkerHandlers(worker: Worker) {
        worker.on('message', (res: { success: boolean; result?: unknown; error?: { message: string; stack?: string } }) => {
            const task = this.workerTasks.get(worker);
            if (!task) return;

            // Очищаем TTL таймаут если он был установлен
            if (task.ttlTimeout) {
                clearTimeout(task.ttlTimeout);
                delete task.ttlTimeout;
            }

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
                // Очищаем TTL таймаут если он был установлен
                if (task.ttlTimeout) {
                    clearTimeout(task.ttlTimeout);
                    delete task.ttlTimeout;
                }
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
        this.setupWorkerHandlers(newWorker);
        this.workers.push(newWorker);
        this.availableWorkers.push(newWorker);
        this.processQueue();
    }

    private processQueue() {
        while (!this.taskQueue.isEmpty() && this.availableWorkers.length > 0) {
            const worker = this.availableWorkers.pop() as Worker;
            const task = this.taskQueue.dequeue() as Task<unknown>;

            // Пропускаем отмененные задачи
            if (task.cancelled) {
                this.availableWorkers.push(worker);
                continue;
            }

            // Очищаем TTL таймаут так как задача начинает выполняться
            if (task.ttlTimeout) {
                clearTimeout(task.ttlTimeout);
                delete task.ttlTimeout;
            }

            this.workerTasks.set(worker, task);
            worker.postMessage({ fn: task.fn.toString(), args: task.args }, task.transferables || []);
        }
    }

    async execute<TArgs extends unknown[], TResult>(
        fn: (...args: TArgs) => TResult,
        args: TArgs = [] as unknown as TArgs,
        ttl?: number
    ): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            const task: Task<unknown> = {
                fn: fn.toString(),
                args,
                transferables: extractTransferables(args),
                resolve: resolve as (value: unknown) => void,
                reject,
                cancelled: false
            };

            const ttlValue = ttl !== undefined ? ttl : this.defaultTTL;

            if (ttlValue && this.availableWorkers.length === 0) {
                task.ttlTimeout = setTimeout(() => {
                    task.cancelled = true;
                    task.reject(new Error('Task TTL expired'));
                }, ttlValue);
            }

            this.taskQueue.enqueue(task);
            this.processQueue();
        });
    }

    async map<T, R>(items: T[], fn: (item: T) => R, ttl?: number): Promise<R[]> {
        return Promise.all(
            items.map(item => this.execute<[T], R>(fn, [item], ttl))
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
        for (const task of this.workerTasks.values()) {
            if (task.ttlTimeout) {
                clearTimeout(task.ttlTimeout);
            }
        }

        while (!this.taskQueue.isEmpty()) {
            const task = this.taskQueue.dequeue();
            if (task) {
                if (task.ttlTimeout) {
                    clearTimeout(task.ttlTimeout);
                }
                task.reject(new Error('Pool terminated'));
            }
        }

        await Promise.all(
            this.workers.map(w => w.terminate())
        );
        this.workers = [];
        this.availableWorkers = [];
        this.taskQueue = new Queue<Task<unknown>>();
        this.workerTasks.clear();
    }
}