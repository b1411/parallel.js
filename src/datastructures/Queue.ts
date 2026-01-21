/**
 * Queue implementation with O(1) amortized time complexity for all operations.
 * Uses two stacks approach for efficient enqueue and dequeue operations.
 */
export class Queue<T> {
    private inStack: T[] = [];
    private outStack: T[] = [];

    enqueue(item: T): void {
        this.inStack.push(item);
    }

    dequeue(): T | undefined {
        if (this.outStack.length === 0) {
            while (this.inStack.length > 0) {
                this.outStack.push(this.inStack.pop() as T);
            }
        }
        return this.outStack.pop();
    }

    size(): number {
        return this.inStack.length + this.outStack.length;
    }

    isEmpty(): boolean {
        return this.inStack.length === 0 && this.outStack.length === 0;
    }

    peek(): T | undefined {
        if (this.outStack.length === 0) {
            while (this.inStack.length > 0) {
                this.outStack.push(this.inStack.pop() as T);
            }
        }
        return this.outStack[this.outStack.length - 1];
    }

    clear(): void {
        this.inStack = [];
        this.outStack = [];
    }
}