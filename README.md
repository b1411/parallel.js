# ⚡ stardust-parallel-js

[![npm version](https://img.shields.io/npm/v/stardust-parallel-js.svg)](https://www.npmjs.com/package/stardust-parallel-js)
[![npm downloads](https://img.shields.io/npm/dm/stardust-parallel-js.svg)](https://www.npmjs.com/package/stardust-parallel-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/b1411/5e96225d1a326e23a38edc41799b1ead/raw/coverage.json)](https://github.com/b1411/parallel.js)
[![Node.js Version](https://img.shields.io/node/v/stardust-parallel-js.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/stardust-parallel-js)](https://bundlephobia.com/package/stardust-parallel-js)
[![GitHub stars](https://img.shields.io/github/stars/b1411/parallel.js.svg?style=social)](https://github.com/b1411/parallel.js)

> **Other languages:** [Русский](./README.ru.md)

A library for parallel execution of JavaScript/TypeScript functions using Worker Threads in Node.js.

## Performance

Benchmarks on 4-core CPU:

| Task | Sequential | Parallel (4 workers) | Speedup |
|------|-----------|---------------------|---------|
| **Fibonacci(35-42) computation** | 5113 ms | 2606 ms | **1.96x** |
| **Processing 50 items** | 936 ms | 344 ms | **2.72x** |

> Performance improvement: up to 63% on CPU-intensive tasks.

## Features

- Real speedup on multi-core processors
- Simple API for parallel task execution
- Thread pool for efficient resource management
- Single thread support for one-off tasks
- Full TypeScript support
- Automatic recovery of crashed threads
- Array processing similar to `map()`, but parallel

## Installation

```bash
npm install stardust-parallel-js
# or
pnpm install stardust-parallel-js
# or
yarn add stardust-parallel-js
```

## Quick Start

Basic usage example:

```typescript
import { ThreadPool } from 'stardust-parallel-js';

const pool = new ThreadPool(4);

// Sequential execution
const results = data.map(item => heavyComputation(item));

// Parallel execution
const results = await pool.map(data, item => heavyComputation(item));

await pool.terminate();
```

## Usage

### ThreadPool - Thread pool (recommended)

Use `ThreadPool` to process multiple tasks with maximum efficiency:

```typescript
import { ThreadPool } from 'stardust-parallel-js';

// Create a pool of 4 threads (matching CPU cores)
const pool = new ThreadPool(4);

// Process array in parallel
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
const squares = await pool.map(numbers, (n: number) => n * n);
console.log(squares); // [1, 4, 9, 16, 25, 36, 49, 64]

// CPU-intensive computations
const result = await pool.execute(
  (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  },
  [1000000]
);

// Release resources
await pool.terminate();
```

### Thread - Single thread (for simple tasks)

Use `Thread` for one-off operations:

```typescript
import { Thread } from 'stardust-parallel-js';

// Start and wait for result
const thread = new Thread(
  (text: string) => text.toUpperCase(),
  ['hello world']
);

const result = await thread.join();
console.log(result); // "HELLO WORLD"

// Arrow functions work!
const thread2 = new Thread(x => x * 2, [21]);
console.log(await thread2.join()); // 42
```

## Examples

### Image Processing

```typescript
import { ThreadPool } from 'stardust-parallel-js';

const pool = new ThreadPool(8);
const images = ['img1.jpg', 'img2.jpg', /* ... */ 'img100.jpg'];

// Process 100 images in parallel
const processed = await pool.map(images, (path: string) => {
  const fs = require('fs');
  const sharp = require('sharp');
  // Complex image processing
  return processImage(path);
});

await pool.terminate();
```

### Parsing Large Data

```typescript
const pool = new ThreadPool(4);
const chunks = splitDataIntoChunks(bigData, 1000);

// Parse each chunk in parallel
const parsed = await pool.map(chunks, (chunk: any[]) => {
  return chunk.map(item => parseComplexData(item));
});

await pool.terminate();
```

### Calculations and Analytics

```typescript
const pool = new ThreadPool(4);

const results = await pool.map([35, 36, 37, 38, 39, 40], n => {
  function fibonacci(num: number): number {
    if (num <= 1) return num;
    return fibonacci(num - 1) + fibonacci(num - 2);
  }
  return fibonacci(n);
});

await pool.terminate();
```

## Benchmarks

Run benchmarks:

```bash
npm run build
npx tsx benchmarks/cpu-intensive.ts
npx tsx benchmarks/data-processing.ts
```

## API Reference

### ThreadPool

#### `constructor(size: number)`
Creates a thread pool of the specified size.

```typescript
const pool = new ThreadPool(4);
```

#### `execute<TArgs, TResult>(fn: (...args: TArgs) => TResult, args?: TArgs): Promise<TResult>`
Executes a function in an available thread from the pool.

```typescript
const result = await pool.execute((x: number) => x * x, [5]);
```

#### `map<T, R>(items: T[], fn: (item: T) => R): Promise<R[]>`
Applies a function to each array element in parallel.

```typescript
// Arrow function
const results = await pool.map([1, 2, 3], n => n * 2);

// Regular function
const results2 = await pool.map([1, 2, 3], function(n) { return n * 2; });
```

#### `terminate(): Promise<void>`
Stops all threads and releases resources.

```typescript
await pool.terminate();
```

### Thread

#### `constructor<T, TArgs>(fn: (...args: TArgs) => T, args?: TArgs)`
Creates a new thread to execute a function.

```typescript
const thread = new Thread((x: number) => x * x, [5]);
```

#### `join(): Promise<T>`
Waits for execution to complete and returns the result. Automatically terminates the thread.

```typescript
const result = await thread.join();
```

## Important Notes

- Functions execute in an isolated context (separate Worker Thread)
- Arguments and results must be serializable
- Closures don't work - functions have no access to external variables
- Regular and arrow functions are supported
- `require()` is available inside functions for using Node.js modules
- Best suited for CPU-intensive tasks (calculations, data processing)
- For I/O operations (reading files, network) use async/await instead of threads

## When to Use

**Use stardust-parallel-js when:**
- Processing large data arrays
- Performing complex calculations
- Parsing or transforming data
- Processing images/video
- Need to utilize all CPU cores

**Don't use when:**
- Simple operations (faster to execute sequentially)
- I/O operations (files, network, DB) - they're already asynchronous
- Working with DOM (Node.js only)

## Choosing Pool Size

```typescript
import os from 'os';

// Optimal: number of CPU cores
const pool = new ThreadPool(os.cpus().length);

// For CPU-intensive tasks
const pool = new ThreadPool(os.cpus().length - 1); // leave 1 core for system

// For mixed workload
const pool = new ThreadPool(os.cpus().length * 2);
```

## Comparison with Alternatives

| Solution | Simplicity | Performance | TypeScript | Size |
|----------|-----------|-------------|------------|------|
| **stardust-parallel-js** | High | High | Full | 9.3kB |
| worker_threads | Medium | High | Partial | Built-in |
| cluster | Medium | Medium | Partial | Built-in |
| child_process | Low | Low | No | Built-in |

## Roadmap

- [x] Support for transferable objects for large data
- [ ] Automatic selection of optimal pool size
- [ ] Task prioritization
- [ ] Monitoring and statistics
- [ ] Support for async functions in threads

## Feedback

Found a bug or have an idea? [Create an issue](https://github.com/b1411/parallel.js).

## Requirements

- Node.js >= 14.0.0 (with Worker Threads support)

## License

MIT © [b1411](https://github.com/b1411)

---

<p align="center">
  Made with ❤️ for the Node.js community
</p>


