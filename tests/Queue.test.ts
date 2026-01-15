import { Queue } from '../src/datastructures/Queue';

describe('Queue', () => {
    let queue: Queue<number>;

    beforeEach(() => {
        queue = new Queue<number>();
    });

    describe('Basic functionality', () => {
        it('should start empty', () => {
            expect(queue.isEmpty()).toBe(true);
            expect(queue.size()).toBe(0);
        });

        it('should enqueue and dequeue single item', () => {
            queue.enqueue(1);
            expect(queue.isEmpty()).toBe(false);
            expect(queue.size()).toBe(1);
            expect(queue.dequeue()).toBe(1);
            expect(queue.isEmpty()).toBe(true);
        });

        it('should maintain FIFO order', () => {
            queue.enqueue(1);
            queue.enqueue(2);
            queue.enqueue(3);
            expect(queue.dequeue()).toBe(1);
            expect(queue.dequeue()).toBe(2);
            expect(queue.dequeue()).toBe(3);
        });

        it('should return undefined when dequeueing from empty queue', () => {
            expect(queue.dequeue()).toBeUndefined();
        });

        it('should handle mixed enqueue/dequeue operations', () => {
            queue.enqueue(1);
            queue.enqueue(2);
            expect(queue.dequeue()).toBe(1);
            queue.enqueue(3);
            expect(queue.dequeue()).toBe(2);
            expect(queue.dequeue()).toBe(3);
            expect(queue.isEmpty()).toBe(true);
        });

        it('should work with different types', () => {
            const stringQueue = new Queue<string>();
            stringQueue.enqueue('hello');
            stringQueue.enqueue('world');
            expect(stringQueue.dequeue()).toBe('hello');
            expect(stringQueue.dequeue()).toBe('world');

            const objQueue = new Queue<{ id: number }>();
            objQueue.enqueue({ id: 1 });
            objQueue.enqueue({ id: 2 });
            expect(objQueue.dequeue()).toEqual({ id: 1 });
            expect(objQueue.dequeue()).toEqual({ id: 2 });
        });

        it('should peek without removing', () => {
            queue.enqueue(1);
            queue.enqueue(2);
            expect(queue.peek()).toBe(1);
            expect(queue.size()).toBe(2);
            expect(queue.peek()).toBe(1);
            expect(queue.dequeue()).toBe(1);
            expect(queue.peek()).toBe(2);
        });

        it('should return undefined when peeking empty queue', () => {
            expect(queue.peek()).toBeUndefined();
        });

        it('should clear the queue', () => {
            queue.enqueue(1);
            queue.enqueue(2);
            queue.enqueue(3);
            queue.clear();
            expect(queue.isEmpty()).toBe(true);
            expect(queue.size()).toBe(0);
            expect(queue.dequeue()).toBeUndefined();
        });
    });

    describe('Performance - O(1) time complexity', () => {
        it('should handle large number of enqueue operations efficiently', () => {
            const n = 100000;
            const start = performance.now();
            
            for (let i = 0; i < n; i++) {
                queue.enqueue(i);
            }
            
            const end = performance.now();
            const timePerOp = (end - start) / n;
            
            expect(queue.size()).toBe(n);
            // Each operation should be very fast (< 0.01ms on average)
            expect(timePerOp).toBeLessThan(0.01);
        });

        it('should handle large number of dequeue operations efficiently', () => {
            const n = 100000;
            
            // Fill the queue
            for (let i = 0; i < n; i++) {
                queue.enqueue(i);
            }
            
            const start = performance.now();
            
            for (let i = 0; i < n; i++) {
                queue.dequeue();
            }
            
            const end = performance.now();
            const timePerOp = (end - start) / n;
            
            expect(queue.isEmpty()).toBe(true);
            // Each operation should be very fast (< 0.01ms on average)
            expect(timePerOp).toBeLessThan(0.01);
        });

        it('should handle mixed operations efficiently', () => {
            const n = 50000;
            const start = performance.now();
            
            // Mix of enqueue and dequeue operations
            for (let i = 0; i < n; i++) {
                queue.enqueue(i);
                if (i % 3 === 0) {
                    queue.dequeue();
                }
            }
            
            for (let i = 0; i < queue.size(); i++) {
                queue.dequeue();
            }
            
            const end = performance.now();
            const totalOps = n * 2;
            const timePerOp = (end - start) / totalOps;
            
            // Each operation should be very fast
            expect(timePerOp).toBeLessThan(0.01);
        });

        it('should verify amortized O(1) complexity', () => {
            const sizes = [1000, 10000, 100000];
            const times: number[] = [];
            
            for (const size of sizes) {
                const testQueue = new Queue<number>();
                const start = performance.now();
                
                // Enqueue
                for (let i = 0; i < size; i++) {
                    testQueue.enqueue(i);
                }
                
                // Dequeue
                for (let i = 0; i < size; i++) {
                    testQueue.dequeue();
                }
                
                const end = performance.now();
                times.push((end - start) / (size * 2));
            }
            
            // Time per operation should not grow significantly with size
            // The ratio between largest and smallest should be small (< 3x)
            const ratio = Math.max(...times) / Math.min(...times);
            expect(ratio).toBeLessThan(3);
        });

        it('should handle rapid size changes efficiently', () => {
            const iterations = 10000;
            const start = performance.now();
            
            for (let i = 0; i < iterations; i++) {
                queue.enqueue(1);
                queue.enqueue(2);
                queue.enqueue(3);
                queue.dequeue();
                queue.dequeue();
                expect(queue.size()).toBeGreaterThan(0);
            }
            
            const end = performance.now();
            const timePerIteration = (end - start) / iterations;
            
            // Each iteration should be fast
            expect(timePerIteration).toBeLessThan(0.05);
        });
    });

    describe('Edge cases', () => {
        it('should handle alternating single enqueue/dequeue', () => {
            for (let i = 0; i < 1000; i++) {
                queue.enqueue(i);
                expect(queue.dequeue()).toBe(i);
                expect(queue.isEmpty()).toBe(true);
            }
        });

        it('should maintain size accuracy with complex operations', () => {
            expect(queue.size()).toBe(0);
            
            queue.enqueue(1);
            queue.enqueue(2);
            expect(queue.size()).toBe(2);
            
            queue.dequeue();
            expect(queue.size()).toBe(1);
            
            queue.enqueue(3);
            queue.enqueue(4);
            expect(queue.size()).toBe(3);
            
            queue.clear();
            expect(queue.size()).toBe(0);
        });

        it('should handle undefined values correctly', () => {
            const undefinedQueue = new Queue<number | undefined>();
            undefinedQueue.enqueue(undefined);
            undefinedQueue.enqueue(1);
            undefinedQueue.enqueue(undefined);
            
            expect(undefinedQueue.size()).toBe(3);
            expect(undefinedQueue.dequeue()).toBeUndefined();
            expect(undefinedQueue.dequeue()).toBe(1);
            expect(undefinedQueue.dequeue()).toBeUndefined();
            expect(undefinedQueue.isEmpty()).toBe(true);
        });

        it('should handle peek after multiple dequeues', () => {
            for (let i = 0; i < 100; i++) {
                queue.enqueue(i);
            }
            
            for (let i = 0; i < 50; i++) {
                queue.dequeue();
            }
            
            expect(queue.peek()).toBe(50);
            expect(queue.size()).toBe(50);
        });
    });

    describe('Concurrent-like stress test', () => {
        it('should handle rapid operations without corruption', () => {
            const operations = 10000;
            const results: number[] = [];
            
            for (let i = 0; i < operations; i++) {
                queue.enqueue(i);
                
                if (i % 2 === 0 && !queue.isEmpty()) {
                    const value = queue.dequeue();
                    if (value !== undefined) {
                        results.push(value);
                    }
                }
            }
            
            // Drain remaining items
            while (!queue.isEmpty()) {
                const value = queue.dequeue();
                if (value !== undefined) {
                    results.push(value);
                }
            }
            
            // All values should be present
            expect(results.length).toBe(operations);
            
            // Values should be in order
            for (let i = 0; i < results.length; i++) {
                expect(results[i]).toBe(i);
            }
        });

        it('should maintain integrity under heavy load', () => {
            const n = 50000;
            
            // Enqueue many items
            for (let i = 0; i < n; i++) {
                queue.enqueue(i);
            }
            
            expect(queue.size()).toBe(n);
            
            // Dequeue half
            for (let i = 0; i < n / 2; i++) {
                expect(queue.dequeue()).toBe(i);
            }
            
            expect(queue.size()).toBe(n / 2);
            
            // Enqueue more
            for (let i = n; i < n * 1.5; i++) {
                queue.enqueue(i);
            }
            
            expect(queue.size()).toBe(n);
            
            // Verify order is maintained
            for (let i = n / 2; i < n; i++) {
                expect(queue.dequeue()).toBe(i);
            }
            
            for (let i = n; i < n * 1.5; i++) {
                expect(queue.dequeue()).toBe(i);
            }
            
            expect(queue.isEmpty()).toBe(true);
        });
    });

    describe('Memory efficiency', () => {
        it('should not leak memory after clear', () => {
            for (let i = 0; i < 10000; i++) {
                queue.enqueue(i);
            }
            
            queue.clear();
            expect(queue.size()).toBe(0);
            expect(queue.isEmpty()).toBe(true);
            
            // Should be able to use again
            queue.enqueue(1);
            expect(queue.dequeue()).toBe(1);
        });

        it('should handle multiple clear operations', () => {
            for (let cycle = 0; cycle < 100; cycle++) {
                for (let i = 0; i < 100; i++) {
                    queue.enqueue(i);
                }
                queue.clear();
                expect(queue.isEmpty()).toBe(true);
            }
        });
    });
});
