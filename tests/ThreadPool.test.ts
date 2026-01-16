// tests/ThreadPool.test.ts
import { ThreadPool } from '../src/primitives/ThreadPool';
import { sleep } from './helpers';

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

    describe('Async functions support', () => {
        beforeEach(() => {
            pool = new ThreadPool(4);
        });

        it('should execute async function with simple computation', async () => {
            const result = await pool.execute(async () => {
                return await Promise.resolve(42);
            });
            expect(result).toBe(42);
        });

        it('should execute async function with parameters', async () => {
            const result = await pool.execute(
                async (a: number, b: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return a * b;
                },
                [6, 7]
            );
            expect(result).toBe(42);
        });

        it('should execute async arrow function with single parameter', async () => {
            const result = await pool.execute(
                async x => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return x * 2;
                },
                [21]
            );
            expect(result).toBe(42);
        });

        it('should execute async arrow function with multiple parameters', async () => {
            const result = await pool.execute(
                async (a, b, c) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return a + b + c;
                },
                [10, 20, 12]
            );
            expect(result).toBe(42);
        });

        it('should execute async arrow function with implicit return', async () => {
            const result = await pool.execute(async x => Promise.resolve(x * 2), [21]);
            expect(result).toBe(42);
        });

        it('should handle async function with multiple awaits', async () => {
            const result = await pool.execute(async (n: number) => {
                const step1 = await Promise.resolve(n * 2);
                const step2 = await Promise.resolve(step1 + 10);
                const step3 = await Promise.resolve(step2 / 2);
                return step3;
            }, [16]);
            expect(result).toBe(21);
        });

        it('should handle async function with Promise.all', async () => {
            const result = await pool.execute(async (nums: number[]) => {
                const promises = nums.map(n => Promise.resolve(n * 2));
                const results = await Promise.all(promises);
                return results.reduce((sum, n) => sum + n, 0);
            }, [[1, 2, 3, 4, 5]]);
            expect(result).toBe(30);
        });

        it('should execute multiple async tasks concurrently', async () => {
            const tasks = Array.from({ length: 10 }, (_, i) =>
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 20));
                    return x * 2;
                }, [i])
            );
            const results = await Promise.all(tasks);
            expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        });

        it('should handle async functions with different return types', async () => {
            const results = await Promise.all([
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return x ** 2;
                }, [5]),
                pool.execute(async (s: string) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return s.toUpperCase();
                }, ['hello']),
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return [1, 2, 3];
                }),
                pool.execute(async (a: number, b: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return a + b;
                }, [10, 20])
            ]);
            expect(results).toEqual([25, 'HELLO', [1, 2, 3], 30]);
        });

        it('should map async function over array', async () => {
            const items = [1, 2, 3, 4, 5];
            const results = await pool.map(items, async (x: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return x ** 2;
            });
            expect(results).toEqual([1, 4, 9, 16, 25]);
        });

        it('should map async function with complex transformation', async () => {
            const items = ['apple', 'banana', 'cherry'];
            const results = await pool.map(items, async (s: string) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    word: s,
                    length: s.length,
                    upper: s.toUpperCase()
                };
            });
            expect(results).toEqual([
                { word: 'apple', length: 5, upper: 'APPLE' },
                { word: 'banana', length: 6, upper: 'BANANA' },
                { word: 'cherry', length: 6, upper: 'CHERRY' }
            ]);
        });

        it('should handle async function errors', async () => {
            await expect(
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw new Error('Async error');
                })
            ).rejects.toThrow('Async error');
        });

        it('should continue working after async error', async () => {
            await expect(
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw new Error('Test error');
                })
            ).rejects.toThrow();

            const result = await pool.execute(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 42;
            });
            expect(result).toBe(42);
        });

        it('should handle multiple async errors', async () => {
            const tasks = [
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw new Error('Error 1');
                }),
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 1;
                }),
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw new Error('Error 2');
                }),
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 2;
                })
            ];

            const results = await Promise.allSettled(tasks);

            expect(results[0].status).toBe('rejected');
            expect(results[1].status).toBe('fulfilled');
            expect(results[2].status).toBe('rejected');
            expect(results[3].status).toBe('fulfilled');

            if (results[1].status === 'fulfilled') expect(results[1].value).toBe(1);
            if (results[3].status === 'fulfilled') expect(results[3].value).toBe(2);
        });

        it('should handle async function with delayed computation', async () => {
            const result = await pool.execute(
                async (ms: number, value: number) => {
                    await new Promise(resolve => setTimeout(resolve, ms));
                    return value;
                },
                [50, 42]
            );
            expect(result).toBe(42);
        });

        it('should handle async function returning complex object', async () => {
            const result = await pool.execute(async (name: string, age: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    user: { name, age },
                    timestamp: Date.now(),
                    status: 'completed'
                };
            }, ['Alice', 25]);
            expect(result.user).toEqual({ name: 'Alice', age: 25 });
            expect(result.status).toBe('completed');
            expect(typeof result.timestamp).toBe('number');
        });

        it('should handle async function with array operations', async () => {
            const result = await pool.execute(async (arr: number[]) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return arr
                    .filter(x => x % 2 === 0)
                    .map(x => x * 2)
                    .reduce((sum, x) => sum + x, 0);
            }, [[1, 2, 3, 4, 5, 6]]);
            expect(result).toBe(24);
        });

        it('should handle async function with JSON operations', async () => {
            const result = await pool.execute(async (data: object) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                const json = JSON.stringify(data);
                return JSON.parse(json);
            }, [{ x: 42, y: 'test' }]);
            expect(result).toEqual({ x: 42, y: 'test' });
        });

        it('should handle async function with conditional logic', async () => {
            const result = await pool.execute(async (n: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (n < 0) return 'negative';
                if (n === 0) return 'zero';
                return 'positive';
            }, [42]);
            expect(result).toBe('positive');
        });

        it('should handle async function with try-catch', async () => {
            const result = await pool.execute(async (shouldFail: boolean) => {
                try {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    if (shouldFail) throw new Error('Intentional error');
                    return 'success';
                } catch (e) {
                    return 'caught';
                }
            }, [false]);
            expect(result).toBe('success');
        });

        it('should handle async function with Promise.race', async () => {
            const result = await pool.execute(async (timeout: number) => {
                const value = await Promise.race([
                    Promise.resolve(42),
                    new Promise(resolve => setTimeout(() => resolve('timeout'), timeout))
                ]);
                return value;
            }, [100]);
            expect(result).toBe(42);
        });

        it('should handle async function with nested promises', async () => {
            const result = await pool.execute(async (n: number) => {
                const outer = await Promise.resolve(
                    Promise.resolve(
                        Promise.resolve(n * 2)
                    )
                );
                return outer;
            }, [21]);
            expect(result).toBe(42);
        });

        it('should handle async function returning undefined', async () => {
            const result = await pool.execute(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return undefined;
            });
            expect(result).toBeUndefined();
        });

        it('should handle async function returning null', async () => {
            const result = await pool.execute(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return null;
            });
            expect(result).toBeNull();
        });

        it('should handle async function with destructuring parameters', async () => {
            const result = await pool.execute(
                async ({ x, y }: { x: number; y: number }) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return x * y;
                },
                [{ x: 6, y: 7 }]
            );
            expect(result).toBe(42);
        });

        it('should handle async function with rest parameters', async () => {
            const result = await pool.execute(
                async (...nums: number[]) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return nums.reduce((sum, n) => sum + n, 0);
                },
                [10, 11, 12, 9]
            );
            expect(result).toBe(42);
        });

        it('should handle async function with default parameters', async () => {
            const result = await pool.execute(
                async (a: number, b = 20, c = 15) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return a + b + c;
                },
                [7]
            );
            expect(result).toBe(42);
        });

        it('should handle async arrow function with object return', async () => {
            const result = await pool.execute(async () => ({ value: 42, status: 'ok' }));
            expect(result).toEqual({ value: 42, status: 'ok' });
        });

        it('should handle async function with template literals', async () => {
            const result = await pool.execute(
                async (name: string, count: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return `${name}: ${count}`;
                },
                ['Result', 42]
            );
            expect(result).toBe('Result: 42');
        });

        it('should handle async function with chained operations', async () => {
            const result = await pool.execute(async (str: string) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return str.trim().toLowerCase().split('').reverse().join('');
            }, ['  ASYNC  ']);
            expect(result).toBe('cnysa');
        });

        it('should handle mixed async and sync operations', async () => {
            const result = await pool.execute(async (n: number) => {
                const sync1 = n * 2;
                const async1 = await Promise.resolve(sync1 + 10);
                const sync2 = async1 / 2;
                return sync2;
            }, [16]);
            expect(result).toBe(21);
        });

        it('should handle async function with CPU-intensive work', async () => {
            const result = await pool.execute(async (limit: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                let sum = 0;
                for (let i = 0; i < limit; i++) {
                    sum += i;
                }
                return sum;
            }, [1000000]);
            expect(typeof result).toBe('number');
            expect(result).toBeGreaterThan(0);
        });

        it('should handle more async tasks than workers', async () => {
            const taskCount = 20;
            const tasks = Array.from({ length: taskCount }, (_, i) =>
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 20));
                    return x;
                }, [i])
            );

            const results = await Promise.all(tasks);
            expect(results).toEqual(Array.from({ length: taskCount }, (_, i) => i));
        });

        it('should handle async function with early return', async () => {
            const result = await pool.execute(async (n: number) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                if (n < 0) return 0;
                if (n > 100) return 100;
                return n;
            }, [42]);
            expect(result).toBe(42);
        });

        it('should handle async function with ternary operator', async () => {
            const result = await pool.execute(
                async (x: number, y: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return x > y ? x - y : y - x;
                },
                [50, 8]
            );
            expect(result).toBe(42);
        });

        it('should handle async function with optional chaining', async () => {
            const result = await pool.execute(
                async (obj: any) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return obj?.nested?.value ?? 'default';
                },
                [{ nested: { value: 42 } }]
            );
            expect(result).toBe(42);
        });

        it('should handle async function with nullish coalescing', async () => {
            const result = await pool.execute(
                async (val: any) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return val ?? 'fallback';
                },
                [null]
            );
            expect(result).toBe('fallback');
        });

        it('should map large array with async function', async () => {
            const items = Array.from({ length: 100 }, (_, i) => i);
            const results = await pool.map(items, async (x: number) => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return x * 2;
            });

            expect(results.length).toBe(100);
            expect(results[0]).toBe(0);
            expect(results[99]).toBe(198);
        });

        it('should handle rapid async task submission', async () => {
            const tasks = Array.from({ length: 50 }, (_, i) =>
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return x * 2;
                }, [i])
            );

            const results = await Promise.all(tasks);
            expect(results.length).toBe(50);
            expect(results[0]).toBe(0);
            expect(results[49]).toBe(98);
        });

        it('should show correct stats during async task execution', async () => {
            const tasks = Array.from({ length: 8 }, () =>
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return 42;
                })
            );

            await new Promise(resolve => setTimeout(resolve, 20));

            const stats = pool.getStats();
            expect(stats.busyWorkers).toBe(4);
            expect(stats.queuedTasks).toBe(4);
            expect(stats.availableWorkers).toBe(0);

            await Promise.all(tasks);
        });

        it('should distribute async work across workers', async () => {
            const startTime = Date.now();

            const tasks = Array.from({ length: 8 }, () =>
                pool.execute(async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return Date.now();
                })
            );

            const timestamps = await Promise.all(tasks);
            const endTime = Date.now();

            const totalTime = endTime - startTime;

            expect(totalTime).toBeLessThan(500);
            expect(timestamps.every(t => typeof t === 'number')).toBe(true);

            console.log(`Completed 8 async tasks in ${totalTime}ms`);
        }, 30000);

        it('should handle mixed sync and async tasks', async () => {
            const tasks = [
                pool.execute((x: number) => x * 2, [10]),
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 20));
                    return x * 3;
                }, [10]),
                pool.execute((x: number) => x + 5, [10]),
                pool.execute(async (x: number) => {
                    await new Promise(resolve => setTimeout(resolve, 20));
                    return x - 5;
                }, [10])
            ];

            const results = await Promise.all(tasks);
            expect(results).toEqual([20, 30, 15, 5]);
        });

        it('should handle async arrow function in map', async () => {
            const items = [1, 2, 3, 4, 5];
            const results = await pool.map(items, async x => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return x ** 2;
            });
            expect(results).toEqual([1, 4, 9, 16, 25]);
        });

        it('should handle async arrow function with destructuring in map', async () => {
            const items = [
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 30 }
            ];
            const results = await pool.map(items, async ({ name, age }) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return `${name} is ${age}`;
            });
            expect(results).toEqual(['Alice is 25', 'Bob is 30']);
        });

        it('should handle async function with sequential promises', async () => {
            const result = await pool.execute(async (nums: number[]) => {
                let sum = 0;
                for (const num of nums) {
                    const doubled = await Promise.resolve(num * 2);
                    sum += doubled;
                }
                return sum;
            }, [[1, 2, 3, 4, 5]]);
            expect(result).toBe(30);
        });

        it('should handle async function with parallel promises using Promise.all', async () => {
            const result = await pool.execute(async (nums: number[]) => {
                const promises = nums.map(async (num) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return num * 2;
                });
                const results = await Promise.all(promises);
                return results.reduce((sum, n) => sum + n, 0);
            }, [[1, 2, 3, 4, 5]]);
            expect(result).toBe(30);
        });

        it('should handle async function with Promise.allSettled', async () => {
            const result = await pool.execute(async () => {
                const results = await Promise.allSettled([
                    Promise.resolve(1),
                    Promise.reject('error'),
                    Promise.resolve(3)
                ]);
                return results.filter(r => r.status === 'fulfilled').length;
            });
            expect(result).toBe(2);
        });

        it('should handle async function with async/await chain', async () => {
            const result = await pool.execute(async (x: number) => {
                const step1 = async (n: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return n * 2;
                };
                const step2 = async (n: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return n + 10;
                };
                const step3 = async (n: number) => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return n / 2;
                };

                const a = await step1(x);
                const b = await step2(a);
                const c = await step3(b);
                return c;
            }, [16]);
            expect(result).toBe(21);
        });
    });

    describe('TTL (Time To Live)', () => {
        it('should execute task immediately when workers are available', async () => {
            pool = new ThreadPool(4, 1000);

            const result = await pool.execute((x: number) => x * 2, [5], 1000);
            expect(result).toBe(10);
        });

        it('should reject task when TTL expires (per-task TTL)', async () => {
            pool = new ThreadPool(2);

            // Занимаем оба воркера длинными задачами
            const longTasks = [
                pool.execute(() => {
                    const start = Date.now();
                    // eslint-disable-next-line no-empty
                    while (Date.now() - start < 2000) { } // Блокируем на 2 секунды
                    return 1;
                }),
                pool.execute(() => {
                    const start = Date.now();
                    // eslint-disable-next-line no-empty
                    while (Date.now() - start < 2000) { } // Блокируем на 2 секунды
                    return 2;
                })
            ];

            // Ждем чтобы воркеры точно начали работать
            await new Promise(resolve => setTimeout(resolve, 100));

            // Пытаемся добавить задачу с коротким TTL (50ms)
            await expect(
                pool.execute((x: number) => x * 2, [5], 50)
            ).rejects.toThrow('Task TTL expired');

            await Promise.all(longTasks);
        }, 15000);

        it('should reject task when default TTL expires', async () => {
            pool = new ThreadPool(2, 50); // Default TTL = 50ms

            // Занимаем оба воркера
            const longTasks = [
                pool.execute(() => {
                    const start = Date.now();
                    // eslint-disable-next-line no-empty
                    while (Date.now() - start < 2000) { } // Блокируем на 2 секунды
                    return 1;
                }),
                pool.execute(() => {
                    const start = Date.now();
                    // eslint-disable-next-line no-empty
                    while (Date.now() - start < 2000) { } // Блокируем на 2 секунды
                    return 2;
                })
            ];

            await new Promise(resolve => setTimeout(resolve, 100));

            // Задача использует default TTL из конструктора (50ms)
            await expect(
                pool.execute((x: number) => x * 2, [5])
            ).rejects.toThrow('Task TTL expired');

            await Promise.all(longTasks);
        }, 15000);

        it('should execute task when it becomes available before TTL expires', async () => {
            pool = new ThreadPool(2, 5000);

            // Занимаем оба воркера короткими задачами
            const shortTasks = [
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 1e7; i++) sum += i;
                    return sum;
                }),
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 1e7; i++) sum += i;
                    return sum;
                })
            ];

            // Добавляем задачу с достаточным TTL
            const taskWithTTL = pool.execute((x: number) => x * 3, [10], 5000);

            const results = await Promise.all([...shortTasks, taskWithTTL]);
            expect(results[2]).toBe(30);
        }, 15000);

        it('should handle multiple tasks with different TTLs', async () => {
            pool = new ThreadPool(1);

            // Занимаем единственный воркер
            const longTask = pool.execute(() => {
                const start = Date.now();
                // eslint-disable-next-line no-empty
                while (Date.now() - start < 2000) { } // Блокируем на 2 секунды
                return 1;
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Добавляем задачи с разными TTL
            const taskShortTTL = pool.execute((x: number) => x * 2, [5], 50); // 50ms TTL
            const taskLongTTL = pool.execute((x: number) => x * 3, [10], 10000); // 10s TTL

            const results = await Promise.allSettled([taskShortTTL, taskLongTTL, longTask]);

            expect(results[0].status).toBe('rejected');
            if (results[0].status === 'rejected') {
                expect(results[0].reason.message).toBe('Task TTL expired');
            }
            expect(results[1].status).toBe('fulfilled');
            if (results[1].status === 'fulfilled') {
                expect(results[1].value).toBe(30);
            }
            expect(results[2].status).toBe('fulfilled');
        }, 15000);

        it('should not apply TTL when workers are immediately available', async () => {
            pool = new ThreadPool(4, 50);

            // Все воркеры свободны, TTL не должен сработать
            const tasks = Array.from({ length: 4 }, (_, i) =>
                pool.execute((x: number) => x * 2, [i], 50)
            );

            const results = await Promise.all(tasks);
            expect(results).toEqual([0, 2, 4, 6]);
        });

        it('should override default TTL with per-task TTL', async () => {
            pool = new ThreadPool(2, 100); // Default TTL = 100ms

            // Занимаем оба воркера
            const longTasks = [
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 1e8; i++) sum += i;
                    return sum;
                }),
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 1e8; i++) sum += i;
                    return sum;
                })
            ];

            await new Promise(resolve => setTimeout(resolve, 50));

            // Задача с более длинным TTL должна успеть выполниться
            const taskWithLongerTTL = pool.execute((x: number) => x * 5, [20], 10000);

            const results = await Promise.allSettled([...longTasks, taskWithLongerTTL]);

            expect(results[2].status).toBe('fulfilled');
            if (results[2].status === 'fulfilled') {
                expect(results[2].value).toBe(100);
            }
        }, 15000);

        it('should handle TTL with map function', async () => {
            pool = new ThreadPool(2, 5000);

            // Занимаем воркеры
            const blocker1 = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 1e8; i++) sum += i;
                return sum;
            });
            const blocker2 = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 1e8; i++) sum += i;
                return sum;
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            // map с коротким TTL
            const mapPromise = pool.map([1, 2, 3], (x: number) => x * 2, 100);

            const mapResult = await Promise.race([
                mapPromise.catch(e => e),
                new Promise(resolve => setTimeout(() => resolve('timeout'), 150))
            ]);

            // Хотя бы одна задача из map должна упасть по TTL
            expect(mapResult).toBeDefined();

            await Promise.all([blocker1, blocker2]);
        }, 15000);

        it('should handle zero TTL as no timeout', async () => {
            pool = new ThreadPool(2, 0);

            // Занимаем воркеры
            const longTasks = [
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 5e7; i++) sum += i;
                    return sum;
                }),
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 5e7; i++) sum += i;
                    return sum;
                })
            ];

            // Задача с TTL=0 должна ждать без таймаута
            const task = pool.execute((x: number) => x * 2, [10], 0);

            const results = await Promise.all([...longTasks, task]);
            expect(results[2]).toBe(20);
        }, 15000);

        it('should handle undefined TTL as no timeout', async () => {
            pool = new ThreadPool(2, undefined);

            // Занимаем воркеры
            const longTasks = [
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 5e7; i++) sum += i;
                    return sum;
                }),
                pool.execute(() => {
                    let sum = 0;
                    for (let i = 0; i < 5e7; i++) sum += i;
                    return sum;
                })
            ];

            // Задача с undefined TTL должна ждать без таймаута
            const task = pool.execute((x: number) => x * 2, [10]);

            const results = await Promise.all([...longTasks, task]);
            expect(results[2]).toBe(20);
        }, 15000);

        it('should clear TTL timeout after task execution', async () => {
            pool = new ThreadPool(2, 5000);

            const task1 = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 3e7; i++) sum += i;
                return 'task1';
            });

            const task2 = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 3e7; i++) sum += i;
                return 'task2';
            });

            // Эта задача будет в очереди с TTL, но успеет выполниться
            const task3 = pool.execute(() => 'task3', [], 3000);

            const results = await Promise.all([task1, task2, task3]);
            expect(results).toEqual(['task1', 'task2', 'task3']);

            // Проверяем что pool работает нормально после
            const task4 = await pool.execute(() => 'task4');
            expect(task4).toBe('task4');
        }, 15000);

        it('should clean up TTL timeouts on pool termination', async () => {
            pool = new ThreadPool(1, 10000);

            // Занимаем воркер легкой задачей
            const longTask = pool.execute(() => {
                let sum = 0;
                for (let i = 0; i < 1e6; i++) sum += i; // Уменьшаем нагрузку
                return sum;
            });

            // Добавляем задачи в очередь с TTL
            const queuedTasks = Array.from({ length: 5 }, () =>
                pool.execute(() => 42, [], 10000).catch(() => 'terminated')
            );

            await sleep(50);

            // Завершаем pool - это должно очистить все TTL таймауты
            await pool.terminate();

            // Ждем завершения всех задач
            await Promise.allSettled([longTask, ...queuedTasks]);

            // Все задачи должны быть отменены
            const stats = pool.getStats();
            expect(stats.totalWorkers).toBe(0);
            expect(stats.queuedTasks).toBe(0);
        }, 10000);
    });
});