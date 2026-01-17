import type { WorkerMessage } from "@/types.js";
import { Worker, type Transferable } from "node:worker_threads";

const workerCode = `
    const { parentPort } = require('worker_threads');
    
    parentPort.on('message', async ({ type, fn, args }) => {
        try {
            const func = eval('(' + fn + ')');
            
            // Execute или Persistent режим
            if (type === 'persistent') {
                // Запускаем и не ждем результата
                func(...args);
                // Не отправляем success - функция работает бесконечно
            } else {
                // Execute режим (по умолчанию)
                const result = await func(...args);
                parentPort.postMessage({ success: true, result });
            }
            
        } catch (error) {
            if (type === 'persistent') {
                // Persistent ошибка - отправляем с type: 'error'
                parentPort.postMessage({ 
                    type: 'error',
                    error: { 
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }
                });
            } else {
                // Execute ошибка - старый формат
                parentPort.postMessage({ 
                    success: false, 
                    error: { 
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    }
                });
            }
        }
    });
`;

export function createWorker() {
    const worker = new Worker(workerCode, { eval: true });
    return {
        worker,
        run<R, TArgs extends unknown[] = unknown[]>(
            fn: (...args: TArgs) => R,
            args: TArgs = [] as unknown as TArgs,
            transferables?: Transferable[]
        ) {
            const message = {
                type: 'execute',
                fn: fn.toString(),
                args
            } satisfies WorkerMessage;
            // Поддержка старого API без type (для обратной совместимости)
            worker.postMessage(message, transferables || []);
        }
    }
}