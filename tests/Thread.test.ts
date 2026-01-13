import { Thread } from '../src/Thread';

describe('Thread', () => {
    it('should execute simple computation', async () => {
        const thread = new Thread(() => {
            return 2 + 2;
        });

        const result = await thread.join();
        expect(result).toBe(4);
    });

    it('should handle function with parameters', async () => {
        const thread = new Thread((a: number, b: number) => {
            return a * b;
        }, [5, 10]);

        const result = await thread.join();
        expect(result).toBe(50);
    });

    it('should execute CPU-intensive task', async () => {
        const thread = new Thread(() => {
            let sum = 0;
            for (let i = 0; i < 1e7; i++) {
                sum += i;
            }
            return sum;
        });

        const result = await thread.join();
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThan(0);
    });

    it('should return string', async () => {
        const thread = new Thread(() => {
            return 'Hello from thread';
        });

        const result = await thread.join();
        expect(result).toBe('Hello from thread');
    });

    it('should handle errors', async () => {
        const thread = new Thread(() => {
            throw new Error('Test error');
        });

        await expect(thread.join()).rejects.toThrow('Test error');
    });

    it('should run multiple threads in parallel', async () => {
        const threads = Array.from({ length: 4 }, (_, i) =>
            new Thread((index: number) => {
                let sum = 0;
                for (let j = 0; j < 1e6; j++) {
                    sum += j;
                }
                return sum + index;
            }, [i])
        );

        const results = await Promise.all(threads.map(t => t.join()));
        expect(results).toHaveLength(4);
        expect(results[0]).not.toBe(results[1]);
    });

    it('should handle complex return types', async () => {
        const thread = new Thread(() => {
            return {
                data: [1, 2, 3],
                status: 'success',
                nested: { value: 42 }
            };
        });

        const result = await thread.join();
        expect(result.data).toEqual([1, 2, 3]);
        expect(result.status).toBe('success');
        expect(result.nested.value).toBe(42);
    });
});