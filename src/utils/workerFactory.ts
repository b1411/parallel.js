import type { WorkerMessage } from "@/types.js";
import { Worker, type Transferable } from "node:worker_threads";

const workerCode = `
    const { parentPort } = require('worker_threads');
    
    parentPort.on('message', async ({ type, fn, args }) => {
        try {
            let cleanFn = fn.replace(/__name\\([^)]+\\);?/g, '').trim();
            
            // Detect async keyword
            const isAsync = /^async\\s+/.test(cleanFn);
            cleanFn = cleanFn.replace(/^async\\s+/, '');
            
            // Arrow function conversion
            const arrowMatch = cleanFn.match(/^\\(([^)]*)\\)\\s*=>\\s*(.+)$/s);
            if (arrowMatch) {
                const params = arrowMatch[1];
                const body = arrowMatch[2].trim();
                
                if (body.startsWith('{') && body.endsWith('}')) {
                    cleanFn = \`\${isAsync ? 'async ' : ''}function(\${params}) \${body}\`;
                } else {
                    cleanFn = \`\${isAsync ? 'async ' : ''}function(\${params}) { return \${body} }\`;
                }
            }
            
            const singleArrowMatch = cleanFn.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=>\\s*(.+)$/s);
            if (singleArrowMatch) {
                const param = singleArrowMatch[1];
                const body = singleArrowMatch[2].trim();
                
                if (body.startsWith('{') && body.endsWith('}')) {
                    cleanFn = \`\${isAsync ? 'async ' : ''}function(\${param}) \${body}\`;
                } else {
                    cleanFn = \`\${isAsync ? 'async ' : ''}function(\${param}) { return \${body} }\`;
                }
            }
            
            const func = eval('(' + cleanFn + ')');
            
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