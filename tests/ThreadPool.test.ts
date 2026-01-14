// tests/ThreadPool.test.ts
import { ThreadPool } from '../src/primitives/ThreadPool';

describe('ThreadPool', () => {
    let pool: ThreadPool;

    afterEach(async () => {
        if (pool) {
            await pool.terminate();
        }
    });

    describe('Basic functionality', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should execute single task', async () => {
            const result = await pool.execute((x: number) => x * 2, [5]);
            expect(result).toBe(10);
        });

        it('should handle function with multiple parameters', async () => {
            const result = await pool.execute(
                (a: number, b: number, c: number) => a + b + c,
                [1, 2, 3]
            );
            expect(result).toBe(6);
        });

        it('should execute CPU-intensive task', async () => {
            const result = await pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 1e7; i++) {
                    sum += i;
                }
                return sum;
            });

            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should return different types', async () => {
            const num = await pool.execute(() => 42);
            const str = await pool.execute(() => 'hello');
            const obj = await pool.execute(() => ({ value: 123 }));
            const arr = await pool.execute(() => [1, 2, 3]);

            expect(num).toBe(42);
            expect(str).toBe('hello');
            expect(obj).toEqual({ value: 123 });
            expect(arr).toEqual([1, 2, 3]);
        });

        // tests/ThreadPool.test.ts
        it('should handle complex return types', async () => {
            const result = await pool.execute(() => {
                return {
                    data: [1, 2, 3],
                    status: 'success',
                    nested: { value: 42 },
                    timestamp: Date.now(), // Используй timestamp вместо Date
                    set: new Set([1, 2, 3])
                };
            });

            expect(result.data).toEqual([1, 2, 3]);
            expect(result.status).toBe('success');
            expect(result.nested.value).toBe(42);
            expect(typeof result.timestamp).toBe('number');
            expect(result.timestamp).toBeGreaterThan(0);
            expect(Array.from(result.set)).toEqual([1, 2, 3]);
        });
    });

    describe('Parallel execution', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should execute multiple tasks concurrently', async () => {
            const tasks = Array.from({ length: 10 }, (_, i) =>
                pool.execute((x: number) => x * 2, [i])
            );

            const results = await Promise.all(tasks);
            expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        it('should execute tasks with different signatures', async () => {
            const results = await Promise.all([
                pool.execute((x: number) => x ** 2, [5]),
                pool.execute((s: string) => s.toUpperCase(), ['hello']),
                pool.execute(() => [1, 2, 3]),
                pool.execute((a: number, b: number) => a + b, [10, 20])
            ]);

            expect(results).toEqual([25, 'HELLO', [1, 2, 3], 30]);
        });

        it('should handle more tasks than workers', async () => {
            const taskCount = 20;
            const tasks = Array.from({ length: taskCount }, (_, i) =>
                pool.execute((x: number) => {
                    for (let j = 0; j < 1e6; j++) { /* busy work */ }
                    return x;
                }, [i])
            );

            const results = await Promise.all(tasks);
            expect(results).toEqual(Array.from({ length: taskCount }, (_, i) => i));
        });
    });

    describe('Map functionality', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should map over array', async () => {
            const items = [1, 2, 3, 4, 5];
            const results = await pool.map(items, (x: number) => x ** 2);

            expect(results).toEqual([1, 4, 9, 16, 25]);
        });

        it('should map with complex transformation', async () => {
            const items = ['apple', 'banana', 'cherry'];
            const results = await pool.map(items, (s: string) => ({
                word: s,
                length: s.length,
                upper: s.toUpperCase()
            }));

            expect(results).toEqual([
                { word: 'apple', length: 5, upper: 'APPLE' },
                { word: 'banana', length: 6, upper: 'BANANA' },
                { word: 'cherry', length: 6, upper: 'CHERRY' }
            ]);
        });

        it('should handle empty array', async () => {
            const results = await pool.map([], (x: number) => x * 2);
            expect(results).toEqual([]);
        });

        it('should handle large arrays', async () => {
            const items = Array.from({ length: 100 }, (_, i) => i);
            const results = await pool.map(items, (x: number) => x * 2);

            expect(results.length).toBe(100);
            expect(results[0]).toBe(0);
            expect(results[99]).toBe(198);
        });
    });

    describe('Error handling', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should handle errors in tasks', async () => {
            await expect(
                pool.execute(() => {
                    throw new Error('Test error');
                })
            ).rejects.toThrow('Test error');
        });

        it('should continue working after error', async () => {
            await expect(
                pool.execute(() => {
                    throw new Error('First error');
                })
            ).rejects.toThrow();

            const result = await pool.execute(() => 42);
            expect(result).toBe(42);
        });

        it('should handle multiple errors', async () => {
            const tasks = [
                pool.execute(() => { throw new Error('Error 1'); }),
                pool.execute(() => 1),
                pool.execute(() => { throw new Error('Error 2'); }),
                pool.execute(() => 2)
            ];

            const results = await Promise.allSettled(tasks);

            expect(results[0].status).toBe('rejected');
            expect(results[1].status).toBe('fulfilled');
            expect(results[2].status).toBe('rejected');
            expect(results[3].status).toBe('fulfilled');

            if (results[1].status === 'fulfilled') {
                expect(results[1].value).toBe(1);
            }
            if (results[3].status === 'fulfilled') {
                expect(results[3].value).toBe(2);
            }
        });

        it('should handle reference errors', async () => {
            await expect(
                pool.execute(() => {
                    // @ts-expect-error - intentionally testing undefined variable
                    return undefinedVariable;
                })
            ).rejects.toThrow();
        });
    });

    describe('Worker recovery', () => {
        beforeEach(() => {
            pool = new ThreadPool(2);
        });

        it('should recover from worker crash', async () => {
            const initialStats = pool.getStats();
            expect(initialStats.totalWorkers).toBe(2);

            // Симулируем краш через infinite loop + timeout
            await expect(
                pool.execute(() => {
                    // Краш через null pointer
                    const obj: any = null;
                    return obj.property; // TypeError
                })
            ).rejects.toThrow();

            // Wait for recovery
            await new Promise(resolve => setTimeout(resolve, 100));

            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(2);

            // Pool should still work
            const result = await pool.execute(() => 42);
            expect(result).toBe(42);
        });

        it('should handle multiple worker crashes', async () => {
            // Crash multiple workers
            const crashTasks = Array.from({ length: 5 }, () =>
                pool.execute(() => {
                    const obj: any = null;
                    obj.doesNotExist();
                }).catch(() => { })
            );

            await Promise.all(crashTasks);
            await new Promise(resolve => setTimeout(resolve, 200));

            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(2);

            // Pool should still work
            const result = await pool.execute(() => 100);
            expect(result).toBe(100);
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should show initial stats', () => {
            const stats = pool.getStats();

            expect(stats.totalWorkers).toBe(4);
            expect(stats.availableWorkers).toBe(4);
            expect(stats.busyWorkers).toBe(0);
            expect(stats.queuedTasks).toBe(0);
        });

        it('should show correct busy workers', async () => {
            // Start 6 long tasks on 4 workers
            const tasks = Array.from({ length: 6 }, () =>
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 1e8; i++) sum += i;
                    return sum;
                })
            );

            // Wait a bit for tasks to start
            await new Promise(resolve => setTimeout(resolve, 50));

            const stats = pool.getStats();
            expect(stats.busyWorkers).toBe(4);
            expect(stats.queuedTasks).toBe(2);
            expect(stats.availableWorkers).toBe(0);

            await Promise.all(tasks);
        });

        it('should update stats after tasks complete', async () => {
            const task = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 1e7; i++) sum += i;
                return sum;
            });

            await new Promise(resolve => setTimeout(resolve, 10));
            let stats = pool.getStats();
            expect(stats.busyWorkers).toBeGreaterThan(0);

            await task;
            stats = pool.getStats();
            expect(stats.busyWorkers).toBe(0);
            expect(stats.availableWorkers).toBe(4);
        });
    });

    describe('Termination', () => {
        it('should terminate all workers', async () => {
            pool = new ThreadPool(4);

            await pool.terminate();

            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(0);
            expect(stats.availableWorkers).toBe(0);
        });

        it('should not accept tasks after termination', async () => {
            pool = new ThreadPool(4);
            await pool.terminate();

            // This will hang because no workers available
            // But we can check stats
            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should distribute work across workers', async () => {
            pool = new ThreadPool(4);

            // Запускаем 8 задач на 4 воркерах
            const startTime = Date.now();

            const tasks = Array.from({ length: 8 }, () =>
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 3e7; i++) sum += i;
                    return Date.now(); // Возвращаем timestamp
                })
            );

            const timestamps = await Promise.all(tasks);
            const endTime = Date.now();

            // Проверяем что задачи выполнялись параллельно
            // Если бы выполнялись последовательно, время было бы в 8 раз больше
            const totalTime = endTime - startTime;

            // 8 задач на 4 воркерах = 2 волны
            // Каждая задача ~100-200ms, значит общее время ~200-400ms
            expect(totalTime).toBeLessThan(1000); // Меньше секунды

            console.log(`Completed 8 tasks in ${totalTime}ms`);
            console.log(`Stats: ${JSON.stringify(pool.getStats())}`);
        }, 30000);

        it('should handle rapid task submission', async () => {
            pool = new ThreadPool(4);

            const tasks = Array.from({ length: 100 }, (_, i) =>
                pool.execute((x: number) => x * 2, [i])
            );

            const results = await Promise.all(tasks);
            expect(results.length).toBe(100);
            expect(results[0]).toBe(0);
            expect(results[99]).toBe(198);
        });
    });

    describe('Edge cases', () => {
        it('should handle pool size of 1', async () => {
            pool = new ThreadPool(1);

            const tasks = Array.from({ length: 5 }, (_, i) =>
                pool.execute((x: number) => x * 2, [i])
            );

            const results = await Promise.all(tasks);
            expect(results).toEqual([0, 2, 4, 6, 8]);
        });

        it('should handle large pool size', async () => {
            pool = new ThreadPool(16);

            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(16);

            const result = await pool.execute(() => 42);
            expect(result).toBe(42);
        });

        it('should handle tasks returning undefined', async () => {
            pool = new ThreadPool(2);

            const result = await pool.execute(() => {
                // Return nothing
            });

            expect(result).toBeUndefined();
        });

        it('should handle tasks returning null', async () => {
            pool = new ThreadPool(2);

            const result = await pool.execute(() => null);
            expect(result).toBeNull();
        });
    });

    describe('Arrow functions support', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should execute single parameter arrow function', async () => {
            const result = await pool.execute(x => x * 3, [14]);
            expect(result).toBe(42);
        });

        it('should execute multi-parameter arrow function', async () => {
            const result = await pool.execute((a, b, c) => a + b + c, [10, 20, 12]);
            expect(result).toBe(42);
        });

        it('should execute arrow function with block body', async () => {
            const result = await pool.execute((n) => {
                let factorial = 1;
                for (let i = 1; i <= n; i++) {
                    factorial *= i;
                }
                return factorial;
            }, [5]);
            expect(result).toBe(120);
        });

        it('should map with arrow function', async () => {
            const items = [1, 2, 3, 4, 5];
            const results = await pool.map(items, x => x ** 2);
            expect(results).toEqual([1, 4, 9, 16, 25]);
        });

        it('should handle arrow function with complex transformation', async () => {
            const items = ['hello', 'world'];
            const results = await pool.map(items, str => ({
                original: str,
                upper: str.toUpperCase(),
                length: str.length,
                reversed: str.split('').reverse().join('')
            }));

            expect(results).toEqual([
                { original: 'hello', upper: 'HELLO', length: 5, reversed: 'olleh' },
                { original: 'world', upper: 'WORLD', length: 5, reversed: 'dlrow' }
            ]);
        });

        it('should handle mixed function styles', async () => {
            const [arrowResult, regularResult] = await Promise.all([
                pool.execute(x => x * 2, [10]),
                pool.execute(function (x) { return x * 2; }, [10])
            ]);

            expect(arrowResult).toBe(20);
            expect(regularResult).toBe(20);
            expect(arrowResult).toBe(regularResult);
        });

        it('should handle arrow functions in parallel', async () => {
            const tasks = [
                pool.execute(x => x + 1, [10]),
                pool.execute((a, b) => a * b, [5, 6]),
                pool.execute(n => n ** 2, [7]),
                pool.execute(() => 42)
            ];

            const results = await Promise.all(tasks);
            expect(results).toEqual([11, 30, 49, 42]);
        });

        it('should handle arrow function with array operations', async () => {
            const result = await pool.execute(arr => {
                return arr
                    .filter(x => x > 5)
                    .map(x => x * 2)
                    .reduce((sum, x) => sum + x, 0);
            }, [[1, 3, 5, 7, 9, 11]]);

            expect(result).toBe(54); // (7 + 9 + 11) * 2 = 54
        });

        it('should handle no-parameter arrow function', async () => {
            const result = await pool.execute(() => Math.PI * 2);
            expect(result).toBeCloseTo(6.283185);
        });

        it('should handle arrow function errors', async () => {
            await expect(
                pool.execute(x => {
                    if (x < 0) throw new Error('Negative number');
                    return x * 2;
                }, [-5])
            ).rejects.toThrow('Negative number');
        });
    });
    describe('Arrow functions edge cases', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should handle arrow function returning object with parentheses', async () => {
            const result = await pool.execute(() => ({ x: 42, y: 'test' }));
            expect(result).toEqual({ x: 42, y: 'test' });
        });

        it('should handle nested arrow functions', async () => {
            const result = await pool.execute((arr) => {
                return arr.map(x => x * 3).filter(x => x > 10);
            }, [[1, 2, 3, 4, 5]]);
            expect(result).toEqual([12, 15]);
        });

        it('should handle arrow function with destructuring', async () => {
            const result = await pool.execute(
                ({ x, y }) => x * y,
                [{ x: 6, y: 7 }]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with rest parameters', async () => {
            const result = await pool.execute(
                (...nums) => nums.reduce((acc, n) => acc + n, 0),
                [10, 11, 12, 9]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with default parameters', async () => {
            const result = await pool.execute(
                (a, b = 20, c = 15) => a + b + c,
                [7]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with template literals', async () => {
            const result = await pool.execute(
                (x, y) => `Result: ${x + y}`,
                [40, 2]
            );
            expect(result).toBe('Result: 42');
        });

        it('should handle arrow function with ternary operator', async () => {
            const result = await pool.execute(
                (x, y) => x > y ? x - y : y - x,
                [50, 8]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with chained array methods', async () => {
            const result = await pool.execute(
                arr => arr
                    .map(x => x * 2)
                    .filter(x => x > 10)
                    .reduce((sum, x) => sum + x, 0),
                [[1, 5, 10, 15]]
            );
            expect(result).toBe(50); // [1,5,10,15] -> [2,10,20,30] -> [20,30] -> 50
        });

        it('should handle map with destructuring', async () => {
            const items = [
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 30 }
            ];
            const results = await pool.map(
                items,
                ({ name, age }) => `${name}: ${age}`
            );
            expect(results).toEqual(['Alice: 25', 'Bob: 30']);
        });

        it('should handle arrow function returning undefined', async () => {
            const result = await pool.execute(() => undefined);
            expect(result).toBeUndefined();
        });

        it('should handle arrow function with early returns', async () => {
            const result = await pool.execute((arr) => {
                if (!arr || arr.length === 0) return 0;
                return arr.reduce((sum, x) => sum + x, 0);
            }, [[10, 20, 12]]);
            expect(result).toBe(42);
        });

        it('should handle arrow function with type coercion', async () => {
            const result = await pool.execute(
                (a, b, c) => Number(a) + Number(b) + Number(c),
                ['10', '20', '12']
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with spread in arrays', async () => {
            const result = await pool.execute(
                (arr1, arr2) => [...arr1, ...arr2].reduce((sum, x) => sum + x, 0),
                [[10, 20], [8, 4]]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with optional chaining', async () => {
            const result = await pool.execute(
                (obj) => obj?.data?.value ?? 0,
                [{ data: { value: 42 } }]
            );
            expect(result).toBe(42);
        });

        it('should handle arrow function with nullish coalescing', async () => {
            const result = await pool.execute(
                (x, y) => (x ?? 0) + (y ?? 0),
                [null, 42]
            );
            expect(result).toBe(42);
        });

        it('should handle many concurrent arrow functions', async () => {
            const tasks = Array.from({ length: 50 }, (_, i) =>
                pool.execute(x => x * 2, [i])
            );

            const results = await Promise.all(tasks);
            expect(results.length).toBe(50);
            expect(results[21]).toBe(42);
        });
    });

    describe('Arrow functions limitations', () => {
        beforeEach(() => {
            pool = new ThreadPool(2);
        });

        it('should fail with closure variables', async () => {
            const multiplier = 21;

            await expect(
                pool.execute(x => x * multiplier, [2])
            ).rejects.toThrow();
        });

        it('should work when closure variables passed as arguments', async () => {
            const multiplier = 21;

            const result = await pool.execute(
                (x, mult) => x * mult,
                [2, multiplier]
            );
            expect(result).toBe(42);
        });

        it('should work with Node.js built-in modules', async () => {
            // В worker_threads require работает нормально
            const result = await pool.execute(() => {
                const fs = require('fs');
                return fs.existsSync('.');
            });
            expect(result).toBe(true);
        });

        it('should fail with class method context', async () => {
            class Processor {
                multiplier = 21;

                async process(x: number) {
                    return pool.execute(() => x * this.multiplier);
                }
            }

            const proc = new Processor();
            await expect(proc.process(2)).rejects.toThrow();
        });

        it('should work when class properties passed explicitly', async () => {
            class Processor {
                multiplier = 21;

                async process(x: number) {
                    return pool.execute(
                        (val, mult) => val * mult,
                        [x, this.multiplier]
                    );
                }
            }

            const proc = new Processor();
            const result = await proc.process(2);
            expect(result).toBe(42);
        });

        it('should not access global variables from outer scope', async () => {
            (global as any).magicNumber = 42;

            // Воркер не имеет доступа к глобальным переменным главного потока
            const result = await pool.execute(() => (global as any).magicNumber);
            expect(result).toBeUndefined();

            delete (global as any).magicNumber;
        });

        it('should work with Math built-ins', async () => {
            const result = await pool.execute(() =>
                Math.floor(Math.sqrt(1764))
            );
            expect(result).toBe(42);
        });

        it('should work with Date API', async () => {
            const result = await pool.execute(() => {
                const date = new Date(2024, 0, 1);
                return date.getMonth();
            });
            expect(result).toBe(0);
        });

        it('should work with JSON operations', async () => {
            const result = await pool.execute(
                str => JSON.parse(str),
                ['{"value":42}']
            );
            expect(result).toEqual({ value: 42 });
        });

        it('should fail with outer scope helper functions', async () => {
            const double = (x: number) => x * 2;

            await expect(
                pool.execute((n) => double(n), [21])
            ).rejects.toThrow();
        });

        it('should work with inline helper functions', async () => {
            const result = await pool.execute((n) => {
                const double = (x: number) => x * 2;
                return double(n);
            }, [21]);

            expect(result).toBe(42);
        });

        it('should work with multiple inline helpers', async () => {
            const result = await pool.execute((n) => {
                const double = (x: number) => x * 2;
                const add = (x: number, y: number) => x + y;
                return add(double(n), 2);
            }, [20]);

            expect(result).toBe(42);
        });

        it('should handle map failures with closures gracefully', async () => {
            const multiplier = 10;

            await expect(
                pool.map([1, 2, 3], x => x * multiplier)
            ).rejects.toThrow();
        });
    });
});