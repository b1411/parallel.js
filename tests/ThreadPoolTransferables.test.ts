import { ThreadPool } from '../src/primitives/ThreadPool';

describe('ThreadPool with Transferables', () => {
    let pool: ThreadPool;

    beforeEach(() => {
        pool = new ThreadPool(4);
    });

    afterEach(async () => {
        await pool.terminate();
    });

    it('should handle ArrayBuffer in execute', async () => {
        const buffer = new ArrayBuffer(512);
        const view = new Uint32Array(buffer);
        view[0] = 100;
        view[1] = 200;

        const result = await pool.execute((buf: ArrayBuffer) => {
            const arr = new Uint32Array(buf);
            return arr[0] + arr[1];
        }, [buffer]);

        expect(result).toBe(300);
    });

    it('should handle Uint8Array in execute', async () => {
        const data = new Uint8Array([10, 20, 30, 40, 50]);

        const result = await pool.execute((arr: Uint8Array) => {
            return arr.reduce((sum, val) => sum + val, 0);
        }, [data]);

        expect(result).toBe(150);
    });

    it('should handle multiple tasks with transferables concurrently', async () => {
        const tasks = [
            new Uint8Array([1, 2, 3]),
            new Uint8Array([4, 5, 6]),
            new Uint8Array([7, 8, 9]),
            new Uint8Array([10, 11, 12])
        ];

        const results = await Promise.all(
            tasks.map(data =>
                pool.execute((arr: Uint8Array) => {
                    return arr.reduce((sum, val) => sum + val, 0);
                }, [data])
            )
        );

        expect(results).toEqual([6, 15, 24, 33]);
    });

    it('should handle map with transferables', async () => {
        const buffers = [
            new Float32Array([1.0, 2.0]),
            new Float32Array([3.0, 4.0]),
            new Float32Array([5.0, 6.0])
        ];

        const results = await pool.map(buffers, (arr: Float32Array) => {
            return arr[0] * arr[1];
        });

        expect(results).toEqual([2.0, 12.0, 30.0]);
    });

    it('should handle large dataset with multiple workers', async () => {
        const size = 1000;
        const chunks = 10;
        const chunkSize = size / chunks;

        const buffers = Array.from({ length: chunks }, (_, i) => {
            const arr = new Float64Array(chunkSize);
            for (let j = 0; j < chunkSize; j++) {
                arr[j] = i * chunkSize + j;
            }
            return arr;
        });

        const startTime = performance.now();
        const results = await pool.map(buffers, (arr: Float64Array) => {
            let sum = 0;
            for (const val of arr) {
                sum += val;
            }
            return sum;
        });
        const endTime = performance.now();

        const totalSum = results.reduce((a, b) => a + b, 0);
        expect(totalSum).toBe((size * (size - 1)) / 2);
        console.log(`Parallel processing time: ${endTime - startTime}ms`);
    });

    it('should work with Int16Array', async () => {
        const data = new Int16Array([-100, -50, 0, 50, 100]);

        const result = await pool.execute((arr: Int16Array) => {
            return arr.reduce((sum, val) => sum + val, 0);
        }, [data]);

        expect(result).toBe(0);
    });

    it('should handle BigInt64Array', async () => {
        const data = new BigInt64Array([10n, 20n, 30n]);

        const result = await pool.execute((arr: BigInt64Array) => {
            return Number(arr[0] + arr[1] + arr[2]);
        }, [data]);

        expect(result).toBe(60);
    });

    it('should handle mixed transferable types', async () => {
        const uint8 = new Uint8Array([1, 2, 3]);
        const float64 = new Float64Array([1.5, 2.5]);

        const result = await pool.execute((arr1: Uint8Array, arr2: Float64Array) => {
            const sum1 = arr1.reduce((a, b) => a + b, 0);
            const sum2 = arr2.reduce((a, b) => a + b, 0);
            return sum1 + sum2;
        }, [uint8, float64]);

        expect(result).toBe(10);
    });

    it('should maintain pool statistics during transferable operations', async () => {
        const tasks = Array.from({ length: 8 }, (_, i) =>
            new Uint32Array([i, i * 2, i * 3])
        );

        const promises = tasks.map(data =>
            pool.execute((arr: Uint32Array) => {
                // Simulate some work
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += arr[0] + arr[1] + arr[2];
                }
                return sum;
            }, [data])
        );

        // Check stats while tasks are running
        await new Promise(resolve => setTimeout(resolve, 10));
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(4);
        expect(stats.busyWorkers).toBeGreaterThan(0);

        await Promise.all(promises);

        const finalStats = pool.getStats();
        expect(finalStats.busyWorkers).toBe(0);
        expect(finalStats.queuedTasks).toBe(0);
    });

    it('should handle errors with transferables gracefully', async () => {
        const data = new Uint8Array([1, 2, 3]);

        await expect(
            pool.execute((_: Uint8Array) => {
                throw new Error('Intentional error');
            }, [data])
        ).rejects.toThrow('Intentional error');

        // Pool should still be functional
        const result = await pool.execute((arr: Uint8Array) => {
            return arr[0];
        }, [new Uint8Array([42])]);

        expect(result).toBe(42);
    });
});
