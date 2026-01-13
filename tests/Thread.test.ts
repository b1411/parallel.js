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

    describe('Arrow functions support', () => {
        it('should handle single parameter arrow function', async () => {
            const thread = new Thread(x => x * 2, [21]);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle multi-parameter arrow function', async () => {
            const thread = new Thread((a, b) => a + b, [15, 27]);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with block', async () => {
            const thread = new Thread((n) => {
                let sum = 0;
                for (let i = 1; i <= n; i++) {
                    sum += i;
                }
                return sum;
            }, [10]);
            const result = await thread.join();
            expect(result).toBe(55);
        });

        it('should handle arrow function returning object', async () => {
            const thread = new Thread((name, age) => ({ name, age }), ['Alice', 25]);
            const result = await thread.join();
            expect(result).toEqual({ name: 'Alice', age: 25 });
        });

        it('should handle arrow function with complex logic', async () => {
            const thread = new Thread((arr) => {
                return arr
                    .filter(x => x % 2 === 0)
                    .map(x => x * 2)
                    .reduce((acc, x) => acc + x, 0);
            }, [[1, 2, 3, 4, 5, 6]]);
            const result = await thread.join();
            expect(result).toBe(24); // (2 + 4 + 6) * 2 = 24
        });

        it('should handle no-parameter arrow function', async () => {
            const thread = new Thread(() => Math.PI * 2);
            const result = await thread.join();
            expect(result).toBeCloseTo(Math.PI * 2);
        });

        it('should mix regular and arrow functions', async () => {
            const thread1 = new Thread(function (x) { return x ** 2; }, [5]);
            const thread2 = new Thread(x => x ** 2, [5]);

            const [result1, result2] = await Promise.all([
                thread1.join(),
                thread2.join()
            ]);

            expect(result1).toBe(25);
            expect(result2).toBe(25);
            expect(result1).toBe(result2);
        });
    });

    // tests/Thread.test.ts

    describe('Arrow functions edge cases', () => {
        it('should handle arrow function returning object with parentheses', async () => {
            const thread = new Thread(() => ({ x: 1, y: 2, z: 3 }));
            const result = await thread.join();
            expect(result).toEqual({ x: 1, y: 2, z: 3 });
        });

        it('should handle nested arrow functions', async () => {
            const thread = new Thread((arr) => {
                return arr.map(x => x * 2).filter(x => x > 5);
            }, [[1, 2, 3, 4, 5]]);
            const result = await thread.join();
            expect(result).toEqual([6, 8, 10]);
        });

        it('should handle arrow function with destructuring', async () => {
            const thread = new Thread(
                ({ a, b, c }) => a + b + c,
                [{ a: 10, b: 20, c: 12 }]
            );
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with rest parameters', async () => {
            const thread = new Thread(
                (...nums) => nums.reduce((sum, n) => sum + n, 0),
                [5, 10, 15, 20]
            );
            const result = await thread.join();
            expect(result).toBe(50);
        });

        it('should handle arrow function with default parameters', async () => {
            const thread = new Thread(
                (x, y = 10, z = 5) => x + y + z,
                [27]
            );
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with template literals', async () => {
            const thread = new Thread(
                (name, age) => `${name} is ${age} years old`,
                ['Bob', 30]
            );
            const result = await thread.join();
            expect(result).toBe('Bob is 30 years old');
        });

        it('should handle arrow function with ternary operator', async () => {
            const thread = new Thread(
                x => x >= 0 ? 'positive' : 'negative',
                [42]
            );
            const result = await thread.join();
            expect(result).toBe('positive');
        });

        it('should handle arrow function with chained methods', async () => {
            const thread = new Thread(
                str => str.trim().toLowerCase().split('').reverse().join(''),
                ['  HELLO  ']
            );
            const result = await thread.join();
            expect(result).toBe('olleh');
        });

        it('should handle arrow function returning undefined explicitly', async () => {
            const thread = new Thread(() => undefined);
            const result = await thread.join();
            expect(result).toBeUndefined();
        });

        it('should handle arrow function with early return', async () => {
            const thread = new Thread((n) => {
                if (n < 0) return 0;
                if (n > 100) return 100;
                return n;
            }, [42]);
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with type coercion', async () => {
            const thread = new Thread(
                (a, b) => Number(a) + Number(b),
                ['15', '27']
            );
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with array destructuring', async () => {
            const thread = new Thread(
                ([first, second, ...rest]) => ({
                    first,
                    second,
                    restSum: rest.reduce((a, b) => a + b, 0)
                }),
                [[10, 20, 5, 4, 3]]
            );
            const result = await thread.join();
            expect(result).toEqual({ first: 10, second: 20, restSum: 12 });
        });

        it('should handle arrow function with spread operator', async () => {
            const thread = new Thread(
                (arr1, arr2) => [...arr1, ...arr2],
                [[1, 2, 3], [4, 5, 6]]
            );
            const result = await thread.join();
            expect(result).toEqual([1, 2, 3, 4, 5, 6]);
        });

        it('should handle arrow function with optional chaining', async () => {
            const thread = new Thread(
                (obj) => obj?.nested?.value ?? 'default',
                [{ nested: { value: 42 } }]
            );
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should handle arrow function with nullish coalescing', async () => {
            const thread = new Thread(
                (val) => val ?? 'fallback',
                [null]
            );
            const result = await thread.join();
            expect(result).toBe('fallback');
        });
    });

    describe('Arrow functions limitations', () => {
        it('should fail with closure variables', async () => {
            const multiplier = 10;
            const thread = new Thread(x => x * multiplier, [5]);

            await expect(thread.join()).rejects.toThrow();
        });

        it('should work when closure variables passed as arguments', async () => {
            const multiplier = 10;
            const offset = 2;

            const thread = new Thread(
                (x, mult, off) => x * mult + off,
                [4, multiplier, offset]
            );
            const result = await thread.join();
            expect(result).toBe(42);
        });

        it('should work with Node.js built-in modules', async () => {
            const thread = new Thread(() => {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const path = require('path');
                return path.join('a', 'b');
            });

            const result = await thread.join();
            expect(result).toContain('a');
            expect(result).toContain('b');
        });

        it('should fail with class method context', async () => {
            class Calculator {
                factor = 10;

                async compute(x: number) {
                    const thread = new Thread(() => x * this.factor);
                    return thread.join();
                }
            }

            const calc = new Calculator();
            await expect(calc.compute(5)).rejects.toThrow();
        });

        it('should work when class properties passed explicitly', async () => {
            class Calculator {
                factor = 10;

                async compute(x: number) {
                    const thread = new Thread(
                        (n, f) => n * f,
                        [x, this.factor]
                    );
                    return thread.join();
                }
            }

            const calc = new Calculator();
            const result = await calc.compute(4);
            expect(result).toBe(40);
        });

        it('should not access global variables from outer scope', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (global as any).testVar = 42;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const thread = new Thread(() => (global as any).testVar);
            const result = await thread.join();
            expect(result).toBeUndefined();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (global as any).testVar;
        });

        it('should work with Math and built-in globals', async () => {
            const thread = new Thread(() => Math.sqrt(16) + Math.abs(-26));
            const result = await thread.join();
            expect(result).toBe(30);
        });

        it('should work with Date and standard APIs', async () => {
            const thread = new Thread(() => {
                const date = new Date('2024-01-01');
                return date.getFullYear();
            });
            const result = await thread.join();
            expect(result).toBe(2024);
        });

        it('should work with JSON operations', async () => {
            const thread = new Thread(
                obj => JSON.parse(JSON.stringify(obj)),
                [{ a: 1, b: 2 }]
            );
            const result = await thread.join();
            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('should fail with imported functions from outer scope', async () => {
            const helper = (x: number) => x * 2;
            const thread = new Thread((n) => helper(n), [21]);

            await expect(thread.join()).rejects.toThrow();
        });

        it('should work when helper function passed as string', async () => {
            const thread = new Thread((n) => {
                const helper = (x: number) => x * 2;
                return helper(n);
            }, [21]);

            const result = await thread.join();
            expect(result).toBe(42);
        });
    });
});