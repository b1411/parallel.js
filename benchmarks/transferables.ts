import { Thread } from '../src/primitives/Thread.js';
import { ThreadPool } from '../src/primitives/ThreadPool.js';
import { performance } from 'node:perf_hooks';

// Benchmark utilities
interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    throughput: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function printResult(result: BenchmarkResult) {
    console.log(`\n📊 ${result.name}`);
    console.log(`   Iterations: ${result.iterations}`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.throughput}`);
}

// Benchmark: Thread with Transferables vs Without
async function benchmarkThreadTransferables() {
    console.log('\n🔥 Benchmark: Thread with 50MB ArrayBuffer\n');
    console.log('='.repeat(60));

    const bufferSize = 50 * 1024 * 1024; // 50 MB
    const iterations = 10;

    // WITH Transferables (default behavior)
    console.log('\n1️⃣  WITH Transferables (zero-copy transfer)');
    const timesWithTransfer: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const buffer = new ArrayBuffer(bufferSize);
        const view = new Uint8Array(buffer);
        view[0] = i;

        const start = performance.now();
        const thread = new Thread(
            (buf: ArrayBuffer) => {
                const arr = new Uint8Array(buf);
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += arr[i];
                }
                return { size: buf.byteLength, sum };
            },
            [buffer]
        );
        await thread.join();
        const time = performance.now() - start;
        timesWithTransfer.push(time);

        // Verify buffer is detached (transferred)
        if (buffer.byteLength !== 0) {
            console.warn(`⚠️  Iteration ${i}: Buffer NOT detached!`);
        }
    }

    const resultWith: BenchmarkResult = {
        name: 'WITH Transferables',
        iterations,
        totalTime: timesWithTransfer.reduce((a, b) => a + b, 0),
        avgTime: timesWithTransfer.reduce((a, b) => a + b, 0) / iterations,
        minTime: Math.min(...timesWithTransfer),
        maxTime: Math.max(...timesWithTransfer),
        throughput: formatBytes(bufferSize * iterations / (timesWithTransfer.reduce((a, b) => a + b, 0) / 1000)) + '/s'
    };

    printResult(resultWith);

    // WITHOUT Transferables (manual serialization simulation)
    console.log('\n2️⃣  WITHOUT Transferables (serialize/deserialize)');
    const timesWithoutTransfer: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const buffer = new ArrayBuffer(bufferSize);
        const view = new Uint8Array(buffer);
        view[0] = i;

        const start = performance.now();

        // Simulate serialization overhead (copy buffer)
        const serialized = Buffer.from(buffer);

        const thread = new Thread(
            (serializedData: Buffer) => {
                // Simulate deserialization
                const buf = serializedData.buffer.slice(
                    serializedData.byteOffset,
                    serializedData.byteOffset + serializedData.byteLength
                );
                const arr = new Uint8Array(buf);
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += arr[i];
                }
                return { size: buf.byteLength, sum };
            },
            [serialized]
        );
        await thread.join();
        const time = performance.now() - start;
        timesWithoutTransfer.push(time);
    }

    const resultWithout: BenchmarkResult = {
        name: 'WITHOUT Transferables (serialized)',
        iterations,
        totalTime: timesWithoutTransfer.reduce((a, b) => a + b, 0),
        avgTime: timesWithoutTransfer.reduce((a, b) => a + b, 0) / iterations,
        minTime: Math.min(...timesWithoutTransfer),
        maxTime: Math.max(...timesWithoutTransfer),
        throughput: formatBytes(bufferSize * iterations / (timesWithoutTransfer.reduce((a, b) => a + b, 0) / 1000)) + '/s'
    };

    printResult(resultWithout);

    // Comparison
    console.log('\n📈 Comparison:');
    const speedup = resultWithout.avgTime / resultWith.avgTime;
    const timeSaved = resultWithout.totalTime - resultWith.totalTime;
    console.log(`   Speedup: ${speedup.toFixed(2)}x faster with transferables`);
    console.log(`   Time Saved: ${timeSaved.toFixed(2)}ms (${((timeSaved / resultWithout.totalTime) * 100).toFixed(1)}%)`);
}

// Benchmark: ThreadPool with different data sizes
async function benchmarkThreadPoolTransferables() {
    console.log('\n\n🔥 Benchmark: ThreadPool with various buffer sizes\n');
    console.log('='.repeat(60));

    const pool = new ThreadPool(4);
    const sizes = [
        { name: '1 MB', size: 1 * 1024 * 1024, tasks: 20 },
        { name: '10 MB', size: 10 * 1024 * 1024, tasks: 10 },
        { name: '50 MB', size: 50 * 1024 * 1024, tasks: 8 },
        { name: '100 MB', size: 100 * 1024 * 1024, tasks: 5 }
    ];

    for (const config of sizes) {
        console.log(`\n📦 Testing with ${config.name} buffers (${config.tasks} tasks)`);

        const buffers = Array.from({ length: config.tasks }, (_, idx) => {
            const buf = new ArrayBuffer(config.size);
            const view = new Uint8Array(buf);
            view[0] = idx;
            return buf;
        });

        const start = performance.now();

        const _results = await Promise.all(
            buffers.map((buffer, idx) =>
                pool.execute(
                    (buf: ArrayBuffer, taskId: number) => {
                        const arr = new Uint8Array(buf);
                        let checksum = 0;
                        for (let i = 0; i < Math.min(10000, arr.length); i++) {
                            checksum += arr[i];
                        }
                        return { taskId, size: buf.byteLength, checksum };
                    },
                    [buffer, idx]
                )
            )
        );

        const totalTime = performance.now() - start;
        const totalBytes = config.size * config.tasks;
        const throughput = formatBytes(totalBytes / (totalTime / 1000));

        console.log(`   ✅ Completed in ${totalTime.toFixed(2)}ms`);
        console.log(`   📊 Throughput: ${throughput}/s`);
        console.log(`   📈 Avg per task: ${(totalTime / config.tasks).toFixed(2)}ms`);
        console.log(`   🔢 Total data: ${formatBytes(totalBytes)}`);
    }

    await pool.terminate();
}

// Benchmark: Concurrent transfers
async function benchmarkConcurrentTransfers() {
    console.log('\n\n🔥 Benchmark: Concurrent Transfer Performance\n');
    console.log('='.repeat(60));

    const bufferSize = 25 * 1024 * 1024; // 25 MB
    const concurrencyLevels = [1, 2, 4, 8, 16];

    for (const concurrency of concurrencyLevels) {
        console.log(`\n🔄 Concurrency Level: ${concurrency} threads`);

        const threads: Thread<any>[] = [];
        const start = performance.now();

        for (let i = 0; i < concurrency; i++) {
            const buffer = new ArrayBuffer(bufferSize);
            const view = new Uint8Array(buffer);
            view[0] = i;

            const thread = new Thread(
                (buf: ArrayBuffer, id: number) => {
                    const arr = new Uint8Array(buf);
                    let sum = 0;
                    // Simulate some work
                    for (let i = 0; i < 100000; i++) {
                        sum += arr[i % arr.length];
                    }
                    return { id, size: buf.byteLength, sum };
                },
                [buffer, i]
            );

            threads.push(thread);
        }

        await Promise.all(threads.map(t => t.join()));
        const totalTime = performance.now() - start;
        const totalBytes = bufferSize * concurrency;
        const throughput = formatBytes(totalBytes / (totalTime / 1000));

        console.log(`   ⏱️  Time: ${totalTime.toFixed(2)}ms`);
        console.log(`   📊 Throughput: ${throughput}/s`);
        console.log(`   📈 Avg per thread: ${(totalTime / concurrency).toFixed(2)}ms`);
        console.log(`   🔢 Total transferred: ${formatBytes(totalBytes)}`);
    }
}

// Benchmark: Memory pressure test
async function benchmarkMemoryPressure() {
    console.log('\n\n🔥 Benchmark: Memory Pressure Test\n');
    console.log('='.repeat(60));

    const pool = new ThreadPool(4);
    const bufferSize = 100 * 1024 * 1024; // 100 MB
    const waves = 5;
    const tasksPerWave = 4;

    console.log(`\n📊 Configuration:`);
    console.log(`   Buffer Size: ${formatBytes(bufferSize)}`);
    console.log(`   Waves: ${waves}`);
    console.log(`   Tasks per Wave: ${tasksPerWave}`);
    console.log(`   Total Data: ${formatBytes(bufferSize * waves * tasksPerWave)}`);

    const waveTimes: number[] = [];

    for (let wave = 0; wave < waves; wave++) {
        const buffers = Array.from({ length: tasksPerWave }, () => {
            const buf = new ArrayBuffer(bufferSize);
            const view = new Uint8Array(buf);
            // Fill with some data
            for (let i = 0; i < 1000; i++) {
                view[i] = i % 256;
            }
            return buf;
        });

        const start = performance.now();

        await Promise.all(
            buffers.map((buffer, _idx) =>
                pool.execute(
                    (buf: ArrayBuffer) => {
                        const arr = new Uint8Array(buf);
                        let checksum = 0;
                        for (let i = 0; i < 10000; i++) {
                            checksum += arr[i];
                        }
                        return { size: buf.byteLength, checksum };
                    },
                    [buffer]
                )
            )
        );

        const waveTime = performance.now() - start;
        waveTimes.push(waveTime);

        console.log(`\n   Wave ${wave + 1}/${waves}:`);
        console.log(`      Time: ${waveTime.toFixed(2)}ms`);
        console.log(`      Throughput: ${formatBytes((bufferSize * tasksPerWave) / (waveTime / 1000))}/s`);
        console.log(`      Stats: ${JSON.stringify(pool.getStats())}`);
    }

    await pool.terminate();

    console.log(`\n📈 Summary:`);
    console.log(`   Total Time: ${waveTimes.reduce((a, b) => a + b, 0).toFixed(2)}ms`);
    console.log(`   Avg Wave Time: ${(waveTimes.reduce((a, b) => a + b, 0) / waves).toFixed(2)}ms`);
    console.log(`   Min Wave: ${Math.min(...waveTimes).toFixed(2)}ms`);
    console.log(`   Max Wave: ${Math.max(...waveTimes).toFixed(2)}ms`);
    console.log(`   Overall Throughput: ${formatBytes((bufferSize * waves * tasksPerWave) / (waveTimes.reduce((a, b) => a + b, 0) / 1000))}/s`);
}

// Main benchmark runner
async function runBenchmarks() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         TRANSFERABLES PERFORMANCE BENCHMARK               ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    try {
        await benchmarkThreadTransferables();
        await benchmarkThreadPoolTransferables();
        await benchmarkConcurrentTransfers();
        await benchmarkMemoryPressure();

        console.log('\n\n✅ All benchmarks completed successfully!\n');
    } catch (error) {
        console.error('\n❌ Benchmark failed:', error);
        process.exit(1);
    }
}

runBenchmarks();
