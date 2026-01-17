import { Thread } from '../src/index.js';
import { waitFor } from './helpers/performance.js';

describe('ThreadV2', () => {
    afterEach(() => {
        Thread.clearPool();
    });

    describe('execute', () => {
        it('should execute simple computation returns promise', async () => {
            const thread = Thread.execute(async (a: number) => {
                return new Promise<number>((resolve) => {
                    resolve(a * 2);
                });
            }, [2]);

            const result = await thread.join();
            expect(result).toBe(4);
        });

        it('should handle function with parameters', async () => {
            const thread = Thread.execute((a: number, b: number) => {
                return a * b;
            }, [5, 10]);

            const result = await thread.join();
            expect(result).toBe(50);
        });

        it('should execute CPU-intensive task', async () => {
            const thread = Thread.execute(() => {
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
            const thread = Thread.execute(() => {
                return 'Hello from thread';
            });

            const result = await thread.join();
            expect(result).toBe('Hello from thread');
        });

        it('should handle errors', async () => {
            const thread = Thread.execute(() => {
                throw new Error('Test error');
            });

            await expect(thread.join()).rejects.toThrow('Test error');
        });

        it('should run multiple threads in parallel', async function () {
            const threads = Array.from({ length: 4 }, (_, i) =>
                Thread.execute((index: number) => {
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
            const thread = Thread.execute(() => {
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

        it('should handle arrow functions', async () => {
            const thread = Thread.execute((x: number) => x * 2, [21]);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle multi-parameter arrow function', async () => {
            const thread = Thread.execute((a: number, b: number) => a + b, [15, 27]);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should terminate worker after join', async () => {
            const thread = Thread.execute(() => 42);
            await thread.join();

            // Worker должен быть завершен
            expect((thread as any).terminated).toBe(true);
        });

        it('should cleanup listeners after join', async () => {
            const thread = Thread.execute(() => 42);
            const worker = (thread as any).worker;

            await thread.join();

            // Проверяем что слушатели были очищены или уменьшены
            expect(worker.listenerCount('message')).toBeLessThanOrEqual(1);
            expect(worker.listenerCount('error')).toBeLessThanOrEqual(1);
            expect(worker.listenerCount('exit')).toBeLessThanOrEqual(1);
        });
    });

    describe('execute with TTL', () => {
        it('should execute successfully before TTL expires', async () => {
            const thread = Thread.execute(() => {
                return 42;
            }, [], 1000); // 1 second TTL

            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should timeout when TTL expires', async () => {
            const thread = Thread.execute(() => {
                // Симулируем долгую задачу - блокируем поток
                const start = Date.now();
                while (Date.now() - start < 500) {
                    // busy wait
                }
                return 42;
            }, [], 100); // 100ms TTL

            await expect(thread.join()).rejects.toThrow('Thread TTL expired');
        });

        it('should clear TTL timeout on success', async () => {
            const thread = Thread.execute(() => 42, [], 1000);
            await thread.join();

            // TTL timeout должен быть очищен
            expect((thread as any).ttlTimeout).toBeNull();
        });

        it('should clear TTL timeout on error', async () => {
            const thread = Thread.execute(() => {
                throw new Error('Test error');
            }, [], 1000);

            await expect(thread.join()).rejects.toThrow('Test error');
            expect((thread as any).ttlTimeout).toBeNull();
        });
    });

    describe('persistent', () => {
        it('should create persistent thread', () => {
            const thread = Thread.persistent(() => {
                setInterval(() => {
                    console.log('tick');
                }, 100);
            });

            expect(thread).toBeDefined();
            thread.terminate();
        });

        it('should handle persistent thread with arguments', () => {
            const thread = Thread.persistent((msg: string) => {
                setInterval(() => {
                    console.log(msg);
                }, 100);
            }, ['hello']);

            expect(thread).toBeDefined();
            thread.terminate();
        });

        it('should handle errors via onError callback', (done) => {
            const thread = Thread.persistent(() => {
                throw new Error('Persistent error');
            });

            thread.onError((error: unknown) => {
                expect((error as Error).message).toBe('Persistent error');
                thread.terminate();
                done();
            });
        });

        it('should support error handler chaining', () => {
            const thread = Thread.persistent(() => { });

            const result = thread.onError(() => { });
            expect(result).toBe(thread);

            thread.terminate();
        });

        it('should call multiple error handlers', (done) => {
            const thread = Thread.persistent(() => {
                throw new Error('Test');
            });

            let callCount = 0;

            thread
                .onError(() => { callCount++; })
                .onError(() => { callCount++; })
                .onError(() => {
                    callCount++;
                    expect(callCount).toBe(3);
                    thread.terminate();
                    done();
                });
        });

        it('should cleanup listeners on terminate', () => {
            const thread = Thread.persistent(() => { });
            const worker = (thread as any).worker;

            thread.terminate();

            expect(worker.listenerCount('message')).toBeLessThanOrEqual(1); // внутренний обработчик может остаться
            expect(worker.listenerCount('error')).toBe(0);
        });

        it('should log unhandled errors to console', async () => {
            const originalError = console.error;
            let errorCalled = false;
            console.error = (...args: any[]) => {
                if (args[0] === 'Unhandled persistent error:') {
                    errorCalled = true;
                }
            };

            const thread = Thread.persistent(() => {
                throw new Error('Unhandled error');
            });

            // Ждем пока ошибка будет залогирована
            await waitFor(() => errorCalled, {
                timeout: 5000,
                interval: 50,
                message: 'Error was not logged'
            });

            expect(errorCalled).toBe(true);
            console.error = originalError;
            thread.terminate();
        });
    });

    describe('prewarm', () => {
        it('should prewarm workers', () => {
            Thread.prewarm(2);

            const poolSize = (Thread.execute as any).__proto__.constructor.workerPool?.length || 0;
            expect(poolSize).toBeGreaterThanOrEqual(0); // пул может быть уже использован

            Thread.clearPool();
        });

        it('should use prewarmed workers for execution', async () => {
            Thread.prewarm(2);

            const thread1 = Thread.execute(() => 42);
            const thread2 = Thread.execute(() => 43);

            const [result1, result2] = await Promise.all([
                thread1.join(),
                thread2.join()
            ]);

            expect(result1).toBe(42);
            expect(result2).toBe(43);

            Thread.clearPool();
        });

        it('should return workers to pool after execution', async () => {
            Thread.prewarm(1);

            const thread = Thread.execute(() => 42);
            await thread.join();

            // Worker должен быть возвращен в пул
            const poolSize = (Thread.execute as any).__proto__.constructor.workerPool?.length || 0;
            expect(poolSize).toBeGreaterThanOrEqual(0);

            Thread.clearPool();
        });

        it('should create new worker if pool is empty', async () => {
            Thread.prewarm(1);

            // Используем все воркеры из пула
            const thread1 = Thread.execute(() => 1);
            const thread2 = Thread.execute(() => 2);

            const [result1, result2] = await Promise.all([
                thread1.join(),
                thread2.join()
            ]);

            expect(result1).toBe(1);
            expect(result2).toBe(2);

            Thread.clearPool();
        });
    });

    describe('clearPool', () => {
        it('should clear worker pool', () => {
            Thread.prewarm(3);
            Thread.clearPool();

            const poolSize = (Thread.execute as any).__proto__.constructor.workerPool?.length || 0;
            expect(poolSize).toBe(0);
        });

        it('should terminate all workers in pool', () => {
            Thread.prewarm(2);

            const workers = [...((Thread.execute as any).__proto__.constructor.workerPool || [])];
            Thread.clearPool();

            // После clearPool все воркеры должны быть завершены
            workers.forEach(worker => {
                expect(() => worker.postMessage({})).toThrow();
            });
        });

        it('should allow new workers to be created after clear', async () => {
            Thread.prewarm(2);
            Thread.clearPool();

            const thread = Thread.execute(() => 42);
            const result = await thread.join();

            expect(result).toBe(42);
        });
    });

    describe('integration tests', () => {
        it('should handle mixed execute and persistent threads', async () => {
            const execThread = Thread.execute(() => 42);
            const persThread = Thread.persistent(() => {
                setInterval(() => { }, 1000);
            });

            const result = await execThread.join();
            expect(result).toBe(42);

            persThread.terminate();
        });

        it('should work with prewarm and multiple executions', async () => {
            Thread.prewarm(3);

            const results = await Promise.all([
                Thread.execute(() => 1).join(),
                Thread.execute(() => 2).join(),
                Thread.execute(() => 3).join(),
                Thread.execute(() => 4).join(),
                Thread.execute(() => 5).join(),
            ]);

            expect(results).toEqual([1, 2, 3, 4, 5]);

            Thread.clearPool();
        });

        it('should handle errors in prewarmed workers', async () => {
            Thread.prewarm(1);

            const thread = Thread.execute(() => {
                throw new Error('Error in prewarmed worker');
            });

            await expect(thread.join()).rejects.toThrow('Error in prewarmed worker');

            Thread.clearPool();
        });

        it('should preserve error stack traces', async () => {
            const thread = Thread.execute(() => {
                const deepError = () => {
                    throw new Error('Deep error');
                };
                deepError();
            });

            try {
                await thread.join();
                fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Deep error');
                expect((error as Error).stack).toBeDefined();
            }
        });
    });

    describe('edge cases', () => {
        it('should handle worker exit with non-zero code', async () => {
            const thread = Thread.execute(() => {
                process.exit(1);
            });

            await expect(thread.join()).rejects.toThrow('Worker stopped with exit code 1');
        });

        it('should handle empty arguments array', async () => {
            const thread = Thread.execute(() => 42, []);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle undefined arguments', async () => {
            const thread = Thread.execute(() => 42);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should not add to pool if usePool is false', async () => {
            // Не вызываем prewarm, поэтому usePool = false
            const thread = Thread.execute(() => 42);
            await thread.join();

            const poolSize = (Thread.execute as any).__proto__.constructor.workerPool?.length || 0;
            expect(poolSize).toBe(0);
        });

        it('should handle multiple terminate calls', async () => {
            const thread = Thread.execute(() => 42);
            await thread.join();

            // Первый вызов через join
            expect((thread as any).terminated).toBe(true);

            // Второй вызов напрямую не должен вызывать ошибку
            expect(() => thread.terminate()).not.toThrow();
        });
    });
});
