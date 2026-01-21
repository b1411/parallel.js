import { parentPort } from "node:worker_threads";
import { extractTransferables } from "@/utils/extractTransferables.js";

parentPort.on("message", async ({ type, fn, args }) => {
    try {
        const func = eval(`(${fn})`);

        if (type === "persistent") {
            await func(...args);
        } else {
            const result = await func(...args);
            const transfers = extractTransferables([args, result]);
            parentPort.postMessage({ success: true, result }, transfers);
        }
    } catch (error) {
        const errorData = {
            message: error.message || String(error),
            stack: error.stack,
        };
        if (type === "execute") {
            const transfers = extractTransferables([args, errorData]);
            parentPort.postMessage(
                { success: false, error: errorData },
                transfers,
            );
        } else {
            parentPort.postMessage({ success: false, error: errorData });
        }
    }
});
