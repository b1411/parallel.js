/**
 * Queue implementation with O(1) amortized time complexity for all operations.
 * Uses two stacks approach for efficient enqueue and dequeue operations.
 */
export class Queue<T> {
    private inStack: T[] = [];
    private outStack: T[] = [];

    /**
     * Adds an element to the end of the queue.
     * Time complexity: O(1)
     */
    enqueue(item: T): void {
        this.inStack.push(item);
    }

    /**
     * Removes and returns the element at the front of the queue.
     * Time complexity: O(1) amortized
     */
    dequeue(): T | undefined {
        if (this.outStack.length === 0) {
            while (this.inStack.length > 0) {
                this.outStack.push(this.inStack.pop() as T);
            }
        }
        return this.outStack.pop();
    }

    /**
     * Returns the number of elements in the queue.
     * Time complexity: O(1)
     */
    size(): number {
        return this.inStack.length + this.outStack.length;
    }

    /**
     * Checks if the queue is empty.
     * Time complexity: O(1)
     */
    isEmpty(): boolean {
        return this.inStack.length === 0 && this.outStack.length === 0;
    }

    /**
     * Returns the element at the front of the queue without removing it.
     * Time complexity: O(1) amortized
     */
    peek(): T | undefined {
        if (this.outStack.length === 0) {
            while (this.inStack.length > 0) {
                this.outStack.push(this.inStack.pop() as T);
            }
        }
        return this.outStack[this.outStack.length - 1];
    }

    /**
     * Removes all elements from the queue.
     * Time complexity: O(1)
     */
    clear(): void {
        this.inStack = [];
        this.outStack = [];
    }
}