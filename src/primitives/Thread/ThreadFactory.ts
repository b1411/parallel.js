import { BaseThread } from "./BaseThread.js";
import { ExecutableThread } from "./ExecutableThread.js";
import { PersistentThread } from "./PersistentThread.js";

export function execute<T, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs, ttl = 0) {
    return new ExecutableThread<T, TArgs>(fn, args, ttl);
}

export function persistent<T, TArgs extends unknown[] = unknown[]>(fn: (...args: TArgs) => T, args: TArgs = [] as unknown as TArgs) {
    return new PersistentThread<T, TArgs>(fn, args);
}

export function prewarm(count = 4) {
    BaseThread.prewarm(count);
}

export function clearPool() {
    BaseThread.clearPool();
}