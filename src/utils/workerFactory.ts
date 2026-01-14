/*
    Worker Factory
    Creates a new Worker instance with predefined code to execute functions.
    Worker returns results or errors back to the main thread.
    Supports both regular and arrow functions.
*/

import { Worker, type Transferable } from "node:worker_threads";

const workerCode = `
            const { parentPort } = require('worker_threads');
            parentPort.on('message', ({ fn, args }) => {
                try {
                    // Remove __name helper calls added by TypeScript
                    let cleanFn = fn.replace(/__name\\([^)]+\\);?/g, '').trim();
                    
                    // Convert arrow functions to regular functions
                    // Handles: (a, b) => expr  or  (a, b) => { ... }
                    const arrowMatch = cleanFn.match(/^\\(([^)]*)\\)\\s*=>\\s*(.+)$/s);
                    if (arrowMatch) {
                        const params = arrowMatch[1];
                        const body = arrowMatch[2].trim();
                        
                        // Check if body is wrapped in braces or is an expression
                        if (body.startsWith('{') && body.endsWith('}')) {
                            cleanFn = \`function(\${params}) \${body}\`;
                        } else {
                            cleanFn = \`function(\${params}) { return \${body} }\`;
                        }
                    }
                    // Handle single parameter arrow functions: x => expr
                    const singleArrowMatch = cleanFn.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=>\\s*(.+)$/s);
                    if (singleArrowMatch) {
                        const param = singleArrowMatch[1];
                        const body = singleArrowMatch[2].trim();
                        
                        if (body.startsWith('{') && body.endsWith('}')) {
                            cleanFn = \`function(\${param}) \${body}\`;
                        } else {
                            cleanFn = \`function(\${param}) { return \${body} }\`;
                        }
                    }
                    
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
    return {
        worker,
        run<R, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => R, args: TArgs = [] as unknown as TArgs, transferables?: Transferable[]) {
            worker.postMessage({ fn: fn.toString(), args }, transferables || []);
        }
    }
}