import { Thread } from "../dist/primitives/Thread"
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function incrementCounter(counterBuffer: SharedArrayBuffer, mutexBuffer: SharedArrayBuffer, mutexPath: string) {
    const { Mutex } = await import(mutexPath);
    const mutex = new Mutex(mutexBuffer);
    const counter = new Int32Array(counterBuffer);

    mutex.lock();
    try {
        const current = counter[0];
        // Симулируем долгую операцию
        for (let i = 0; i < 1e6; i++);
        counter[0] = current + 1;
        console.log(`Counter: ${counter[0]}`);
    } finally {
        mutex.unlock();
    }
}

async function main() {
    const counterBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const counter = new Int32Array(counterBuffer);
    counter[0] = 0;

    const mutexBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const mutexPath = pathToFileURL(join(__dirname, '../dist/primitives/sync/Mutex.js')).href;

    // Запускаем все потоки параллельно
    const threads = [];
    for (let i = 0; i < 10; i++) {
        threads.push(Thread.execute(incrementCounter, [counterBuffer, mutexBuffer, mutexPath]));
    }

    // Ждем завершения всех потоков
    await Promise.all(threads.map(t => t.join()));

    console.log('Final counter:', counter[0]);
}

main()