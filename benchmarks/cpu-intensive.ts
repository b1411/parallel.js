import { ThreadPool } from "../src/index";

// CPU-интенсивная задача: вычисление чисел Фибоначчи
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

async function benchmarkSequential(numbers: number[]): Promise<number> {
  const start = performance.now();
  numbers.map(n => fibonacci(n));
  const end = performance.now();
  return end - start;
}

async function benchmarkParallel(numbers: number[], poolSize: number): Promise<number> {
  const pool = new ThreadPool(poolSize);
  const start = performance.now();

  await pool.map(numbers, (n: number) => {
    function fibonacci(num: number): number {
      if (num <= 1) return num;
      return fibonacci(num - 1) + fibonacci(num - 2);
    }
    return fibonacci(n);
  });

  const end = performance.now();
  await pool.terminate();
  return end - start;
}

async function runBenchmark() {
  console.log('🚀 Бенчмарк: Вычисление чисел Фибоначчи\n');

  const numbers = [35, 36, 37, 38, 39, 40, 41, 42];
  const poolSize = 4;

  console.log(`📊 Задачи: ${numbers.length} чисел Фибоначчи`);
  console.log(`   Числа: ${numbers.join(', ')}\n`);

  // Последовательное выполнение
  console.log('⏱️  Последовательное выполнение...');
  const seqTime = await benchmarkSequential(numbers);
  console.log(`   Время: ${seqTime.toFixed(2)} мс\n`);

  // Параллельное выполнение
  console.log(`⚡ Параллельное выполнение (${poolSize} потоков)...`);
  const parTime = await benchmarkParallel(numbers, poolSize);
  const speedup = (seqTime / parTime).toFixed(2);
  const improvement = (((seqTime - parTime) / seqTime) * 100).toFixed(1);

  console.log(`   Время: ${parTime.toFixed(2)} мс`);
  console.log(`\n✨ Результат:`);
  console.log(`   🔥 Ускорение: ${speedup}x`);
  console.log(`   📈 Улучшение: ${improvement}%`);
}

runBenchmark().catch(console.error);
