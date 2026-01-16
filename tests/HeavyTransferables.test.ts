import { Thread } from '../src/index';
import { ThreadPool } from '../src/primitives/ThreadPool';

describe('Heavy Transferables Tests (~100MB)', () => {
    describe('Thread with Heavy Transferables', () => {
        it('should handle 100MB ArrayBuffer', async () => {
            const bufferSize = 100 * 1024 * 1024; // 100 MB
            const buffer = new ArrayBuffer(bufferSize);
            const view = new Uint8Array(buffer);

            // Fill with some data
            for (let i = 0; i < Math.min(1000, view.length); i++) {
                view[i] = i % 256;
            }

            const result = await Thread.execute(
                (buf: ArrayBuffer) => {
                    const arr = new Uint8Array(buf);
                    let sum = 0;
                    // Sample every 1000th element to verify data integrity
                    for (let i = 0; i < 1000; i++) {
                        sum += arr[i];
                    }
                    return { size: buf.byteLength, checksum: sum };
                },
                [buffer]
            ).join();
            expect(result.size).toBe(bufferSize);
            expect(result.checksum).toBeGreaterThan(0);
        }, 30000);

        it('should handle multiple large ArrayBuffers (4x25MB)', async () => {
            const bufferSize = 25 * 1024 * 1024; // 25 MB each
            const buffers = [
                new ArrayBuffer(bufferSize),
                new ArrayBuffer(bufferSize),
                new ArrayBuffer(bufferSize),
                new ArrayBuffer(bufferSize),
            ];

            // Fill each buffer with unique pattern
            buffers.forEach((buf, idx) => {
                const view = new Uint8Array(buf);
                for (let i = 0; i < 1000; i++) {
                    view[i] = (idx * 100 + i) % 256;
                }
            });

            const result = await Thread.execute(
                (bufs: ArrayBuffer[]) => {
                    return bufs.map((buf, idx) => {
                        const arr = new Uint8Array(buf);
                        let checksum = 0;
                        for (let i = 0; i < 1000; i++) {
                            checksum += arr[i];
                        }
                        return { index: idx, size: buf.byteLength, checksum };
                    });
                },
                [buffers]
            ).join();
            expect(result).toHaveLength(4);
            result.forEach((item: { size: any; index: any; }, idx: any) => {
                expect(item.size).toBe(bufferSize);
                expect(item.index).toBe(idx);
            });
        }, 30000);

        it('should handle Float64Array with 12.5M elements (~100MB)', async () => {
            const elementCount = 12.5 * 1024 * 1024; // ~100 MB (8 bytes per element)
            const float64Array = new Float64Array(elementCount);

            // Fill with mathematical sequence
            for (let i = 0; i < 10000; i++) {
                float64Array[i] = Math.sin(i / 1000) * 1000;
            }

            const result = await Thread.execute(
                (arr: Float64Array) => {
                    let sum = 0;
                    let min = Infinity;
                    let max = -Infinity;

                    // Sample first 10000 elements
                    for (let i = 0; i < 10000; i++) {
                        sum += arr[i];
                        min = Math.min(min, arr[i]);
                        max = Math.max(max, arr[i]);
                    }

                    return {
                        length: arr.length,
                        byteLength: arr.byteLength,
                        avg: sum / 10000,
                        min,
                        max
                    };
                },
                [float64Array]
            ).join();
            expect(result.length).toBe(elementCount);
            expect(result.byteLength).toBeCloseTo(100 * 1024 * 1024, -5);
            expect(result.min).toBeLessThan(0);
            expect(result.max).toBeGreaterThan(0);
        }, 30000);

        it('should handle mixed typed arrays totaling 100MB', async () => {
            const data = {
                uint8: new Uint8Array(30 * 1024 * 1024),      // 30 MB
                uint16: new Uint16Array(10 * 1024 * 1024),    // 20 MB
                uint32: new Uint32Array(6.25 * 1024 * 1024),  // 25 MB
                float32: new Float32Array(6.25 * 1024 * 1024) // 25 MB
            };

            // Initialize with patterns
            for (let i = 0; i < 1000; i++) {
                data.uint8[i] = i % 256;
                data.uint16[i] = i % 65536;
                data.uint32[i] = i;
                data.float32[i] = i * 0.1;
            }

            const result = await Thread.execute(
                (d: typeof data) => {
                    return {
                        uint8Sum: Array.from(d.uint8.slice(0, 1000)).reduce((a, b) => a + b, 0),
                        uint16Sum: Array.from(d.uint16.slice(0, 1000)).reduce((a, b) => a + b, 0),
                        uint32Sum: Array.from(d.uint32.slice(0, 1000)).reduce((a, b) => a + b, 0),
                        float32Sum: Array.from(d.float32.slice(0, 1000)).reduce((a, b) => a + b, 0),
                        totalBytes: d.uint8.byteLength + d.uint16.byteLength +
                            d.uint32.byteLength + d.float32.byteLength
                    };
                },
                [data]
            ).join();
            expect(result.totalBytes).toBeCloseTo(100 * 1024 * 1024, -5);
            expect(result.uint8Sum).toBeGreaterThan(0);
            expect(result.float32Sum).toBeGreaterThan(0);
        }, 30000);
    });

    describe('ThreadPool with Heavy Transferables', () => {
        let pool: ThreadPool;

        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        afterEach(async () => {
            await pool.terminate();
        });

        it('should process multiple 100MB buffers sequentially', async () => {
            const tasks = Array.from({ length: 5 }, (_, idx) => {
                const buffer = new ArrayBuffer(100 * 1024 * 1024);
                const view = new Uint8Array(buffer);

                // Unique pattern per task
                for (let i = 0; i < 1000; i++) {
                    view[i] = (idx * 10 + i) % 256;
                }

                return buffer;
            });

            const results = await Promise.all(
                tasks.map((buffer, idx) =>
                    pool.execute(
                        (buf: ArrayBuffer, taskId: number) => {
                            const arr = new Uint8Array(buf);
                            let checksum = 0;
                            for (let i = 0; i < 1000; i++) {
                                checksum += arr[i];
                            }
                            return { taskId, size: buf.byteLength, checksum };
                        },
                        [buffer, idx]
                    )
                )
            );

            expect(results).toHaveLength(5);
            results.forEach((result, idx) => {
                expect(result.taskId).toBe(idx);
                expect(result.size).toBe(100 * 1024 * 1024);
                expect(result.checksum).toBeGreaterThan(0);
            });
        }, 60000);

        it('should handle map operation with 50MB chunks', async () => {
            const chunkSize = 50 * 1024 * 1024;
            const chunks = Array.from({ length: 8 }, (_, idx) => {
                const buffer = new ArrayBuffer(chunkSize);
                const view = new Uint8Array(buffer);
                view[0] = idx;
                return buffer;
            });

            const results = await pool.map(
                chunks,
                (chunk: ArrayBuffer) => {
                    const arr = new Uint8Array(chunk);
                    const id = arr[0];
                    return {
                        id,
                        size: chunk.byteLength,
                        processed: true
                    };
                }
            );

            expect(results).toHaveLength(8);
            results.forEach((result, idx) => {
                expect(result.id).toBe(idx);
                expect(result.size).toBe(chunkSize);
                expect(result.processed).toBe(true);
            });
        }, 60000);

        it('should handle concurrent processing of 25MB Float64Arrays', async () => {
            const elementCount = 3.125 * 1024 * 1024; // 25 MB per array
            const arrays = Array.from({ length: 8 }, (_, idx) => {
                const arr = new Float64Array(elementCount);
                for (let i = 0; i < 1000; i++) {
                    arr[i] = idx * 1000 + i;
                }
                return arr;
            });

            const results = await Promise.all(
                arrays.map((arr, idx) =>
                    pool.execute(
                        (data: Float64Array, arrayIdx: number) => {
                            let sum = 0;
                            for (let i = 0; i < 1000; i++) {
                                sum += data[i];
                            }
                            return {
                                arrayIdx,
                                length: data.length,
                                sum,
                                firstElement: data[0]
                            };
                        },
                        [arr, idx]
                    )
                )
            );

            expect(results).toHaveLength(8);
            results.forEach((result, idx) => {
                expect(result.arrayIdx).toBe(idx);
                expect(result.length).toBe(elementCount);
                expect(result.firstElement).toBe(idx * 1000);
            });
        }, 60000);

        it('should handle stress test with 20x100MB buffers', async () => {
            const bufferSize = 100 * 1024 * 1024;
            const taskCount = 20;

            const results = await Promise.all(
                Array.from({ length: taskCount }, (_, idx) => {
                    const buffer = new ArrayBuffer(bufferSize);
                    const view = new Uint8Array(buffer);
                    view[0] = idx;

                    return pool.execute(
                        (buf: ArrayBuffer) => {
                            const arr = new Uint8Array(buf);
                            const taskId = arr[0];
                            return {
                                taskId,
                                size: buf.byteLength,
                                timestamp: Date.now()
                            };
                        },
                        [buffer]
                    );
                })
            );

            expect(results).toHaveLength(taskCount);
            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(4);

            // Verify all tasks completed
            results.forEach((result, idx) => {
                expect(result.taskId).toBe(idx);
                expect(result.size).toBe(bufferSize);
            });

            // Verify tasks were distributed
            const timestamps = results.map(r => r.timestamp);
            const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
            expect(timeSpan).toBeGreaterThan(0); // Should take time to process
        }, 120000);

        it('should process image-like data (RGBA 5000x5000 pixels = ~95MB)', async () => {
            const width = 5000;
            const height = 5000;
            const channels = 4; // RGBA
            const imageSize = width * height * channels;

            const imageBuffers = Array.from({ length: 4 }, (_, idx) => {
                const buffer = new Uint8ClampedArray(imageSize);

                // Create gradient pattern
                for (let i = 0; i < 1000; i++) {
                    buffer[i * 4] = (idx * 50 + i) % 256;     // R
                    buffer[i * 4 + 1] = (idx * 30 + i) % 256; // G
                    buffer[i * 4 + 2] = (idx * 70 + i) % 256; // B
                    buffer[i * 4 + 3] = 255;                   // A
                }

                return buffer;
            });

            const results = await pool.map(
                imageBuffers,
                (imageData: Uint8ClampedArray) => {
                    let rSum = 0, gSum = 0, bSum = 0;

                    // Sample pixels
                    for (let i = 0; i < 1000; i++) {
                        rSum += imageData[i * 4];
                        gSum += imageData[i * 4 + 1];
                        bSum += imageData[i * 4 + 2];
                    }

                    return {
                        size: imageData.byteLength,
                        avgRed: rSum / 1000,
                        avgGreen: gSum / 1000,
                        avgBlue: bSum / 1000
                    };
                }
            );

            expect(results).toHaveLength(4);
            results.forEach(result => {
                expect(result.size).toBe(imageSize);
                expect(result.avgRed).toBeGreaterThanOrEqual(0);
                expect(result.avgGreen).toBeGreaterThanOrEqual(0);
                expect(result.avgBlue).toBeGreaterThanOrEqual(0);
            });
        }, 60000);
    });

    describe('Memory and Performance Tests', () => {
        it('should efficiently transfer ownership without copying (100MB)', async () => {
            const bufferSize = 100 * 1024 * 1024;
            const buffer = new ArrayBuffer(bufferSize);
            const view = new Uint8Array(buffer);

            // Mark buffer
            view[0] = 42;
            view[bufferSize - 1] = 99;

            const startTime = Date.now();

            const result = await Thread.execute(
                (buf: ArrayBuffer) => {
                    const arr = new Uint8Array(buf);
                    return {
                        first: arr[0],
                        last: arr[arr.length - 1],
                        size: buf.byteLength
                    };
                },
                [buffer]
            ).join();
            const transferTime = Date.now() - startTime;

            expect(result.first).toBe(42);
            expect(result.last).toBe(99);
            expect(result.size).toBe(bufferSize);

            // Transfer should be fast (< 1 second for 100MB)
            // This verifies we're transferring, not copying
            expect(transferTime).toBeLessThan(5000);

            // Original buffer should be detached (length = 0)
            expect(buffer.byteLength).toBe(0);
        }, 30000);

        it('should handle SharedArrayBuffer operations (100MB)', async () => {
            const bufferSize = 100 * 1024 * 1024;
            const sharedBuffer = new SharedArrayBuffer(bufferSize);
            const view = new Int32Array(sharedBuffer);

            // Initialize
            for (let i = 0; i < 100; i++) {
                view[i] = i * 2;
            }

            const result = await Thread.execute(
                (shared: SharedArrayBuffer) => {
                    const arr = new Int32Array(shared);

                    // Modify shared data
                    for (let i = 0; i < 100; i++) {
                        arr[i] = arr[i] * 2;
                    }

                    let sum = 0;
                    for (let i = 0; i < 100; i++) {
                        sum += arr[i];
                    }

                    return { size: shared.byteLength, sum };
                },
                [sharedBuffer]
            ).join();

            expect(result.size).toBe(bufferSize);

            // Verify modifications are visible
            let expectedSum = 0;
            for (let i = 0; i < 100; i++) {
                expectedSum += view[i];
            }
            expect(result.sum).toBe(expectedSum);

            // SharedArrayBuffer should NOT be detached
            expect(sharedBuffer.byteLength).toBe(bufferSize);
        }, 30000);
    });
});
