import { Thread } from '../src/index';

describe('Thread with Transferables', () => {
    it('should handle ArrayBuffer transferables', async () => {
        const buffer = new ArrayBuffer(1024);
        const view = new Uint8Array(buffer);
        view[0] = 42;
        view[1] = 100;

        const thread = Thread.execute((buf: ArrayBuffer) => {
            const arr = new Uint8Array(buf);
            return arr[0] + arr[1];
        }, [buffer]);

        const result = await thread.join();
        expect(result).toBe(142);
    });

    it('should handle Uint8Array transferables', async () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);

        const thread = Thread.execute((arr: Uint8Array) => {
            return arr.reduce((sum, val) => sum + val, 0);
        }, [data]);

        const result = await thread.join();
        expect(result).toBe(15);
    });

    it('should handle Int32Array transferables', async () => {
        const data = new Int32Array([10, 20, 30, 40]);

        const thread = Thread.execute((arr: Int32Array) => {
            return arr[0] * arr[3];
        }, [data]);

        const result = await thread.join();
        expect(result).toBe(400);
    });

    it('should handle Float64Array transferables', async () => {
        const data = new Float64Array([1.5, 2.5, 3.5]);

        const thread = Thread.execute((arr: Float64Array) => {
            return arr[0] + arr[1] + arr[2];
        }, [data]);

        const result = await thread.join();
        expect(result).toBe(7.5);
    });

    it('should handle multiple transferables in array', async () => {
        const buffer1 = new Uint8Array([1, 2, 3]);
        const buffer2 = new Uint8Array([4, 5, 6]);

        const thread = Thread.execute((arr1: Uint8Array, arr2: Uint8Array) => {
            const sum1 = arr1.reduce((a, b) => a + b, 0);
            const sum2 = arr2.reduce((a, b) => a + b, 0);
            return sum1 + sum2;
        }, [buffer1, buffer2]);

        const result = await thread.join();
        expect(result).toBe(21);
    });

    it('should handle large data transfer efficiently', async () => {
        const size = 1024 * 1024; // 1MB
        const largeBuffer = new Float64Array(size);
        for (let i = 0; i < size; i++) {
            largeBuffer[i] = i;
        }

        const startTime = performance.now();
        const thread = Thread.execute((arr: Float64Array) => {
            let sum = 0;
            for (const val of arr) {
                sum += val;
            }
            return sum;
        }, [largeBuffer]);

        const result = await thread.join();
        const endTime = performance.now();

        expect(result).toBe((size * (size - 1)) / 2);
        console.log(`Transfer time for 1MB: ${endTime - startTime}ms`);
    });

    it('should work with mixed arguments (transferable and non-transferable)', async () => {
        const buffer = new Uint8Array([10, 20, 30]);
        const multiplier = 2;

        const thread = Thread.execute((arr: Uint8Array, mult: number) => {
            return arr.reduce((sum, val) => sum + val * mult, 0);
        }, [buffer, multiplier]);

        const result = await thread.join();
        expect(result).toBe(120);
    });

    it('should handle nested objects with transferables', async () => {
        const data = {
            buffer: new Uint8Array([5, 10, 15]),
            metadata: {
                name: 'test',
                count: 3
            }
        };

        const thread = Thread.execute((obj: typeof data) => {
            const sum = obj.buffer.reduce((a, b) => a + b, 0);
            return sum * obj.metadata.count;
        }, [data]);

        const result = await thread.join();
        expect(result).toBe(90);
    });
});
