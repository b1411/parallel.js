/*
    Worker Factory
    Creates a new Worker instance with predefined code to execute functions.
    Worker returns results or errors back to the main thread.
*/

import { Worker } from "node:worker_threads";

const workerCode = `
            const { parentPort } = require('worker_threads');
            parentPort.on('message', ({ fn, args }) => {
                try {
                    // Remove __name helper calls added by TypeScript
                    const cleanFn = fn.replace(/__name\\([^)]+\\);?/g, '');
                    const func = eval('(' + cleanFn + ')');
                    const result = func(...args);
                    parentPort.postMessage({ success: true, result });
                } catch (error) {
                    parentPort.postMessage({ success: false, error: error.message });
                }
            });
        `;

export function createWorker() {
    const worker = new Worker(workerCode, { eval: true });
    return worker;
}