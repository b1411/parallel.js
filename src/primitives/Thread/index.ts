import { BaseThread } from "./BaseThread.js";
import { ExecutableThread } from "./ExecutableThread.js";
import { PersistentThread } from "./PersistentThread.js";

export const Thread = {
    execute<T, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs, ttl = 0) {
        return new ExecutableThread<T, TArgs>(fn, args, ttl);
    },

    persistent<T, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs) {
        return new PersistentThread<T, TArgs>(fn, args);
    },

    prewarm(count = 4) {
        BaseThread.prewarm(count);
    },

    clearPool() {
        BaseThread.clearPool();
    }
}