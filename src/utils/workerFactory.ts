/*
    Worker Factory
    Creates a new Worker instance with predefined code to execute functions.
    Worker returns results or errors back to the main thread.
    Supports both regular and arrow functions.
*/

import { Worker, type Transferable } from "node:worker_threads";

const workerCode = `
            const { parentPort } = require('worker_threads');
            parentPort.on('message', async ({ fn, args }) => {
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
                    const result = await func(...args);
                    parentPort.postMessage({ success: true, result });
                } catch (error) {
                    if (error instanceof Error) {
                        parentPort.postMessage({ success: false, error: { message: error.message, stack: error.stack } });
                    } else {
                        parentPort.postMessage({ success: false, error: { message: String(error) } });
                    }
                }
            });
        `;

export function createWorker() {
    const worker = new Worker(workerCode, { eval: true });
    return {
        worker,
        run<R, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => R, args: TArgs = [] as unknown as TArgs, transferables?: Transferable[]) {
            worker.postMessage({ fn: fn.toString(), args }, transferables || []);
        }
    }
}