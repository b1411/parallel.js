import { ThreadPool } from "../src/index";

// Обработка данных: сложные математические операции
function processData(item: number): number {
  let result = item;
  for (let i = 0; i < 500000; i++) {
    result = Math.sqrt(result + i) * Math.sin(i) * Math.cos(result);
  }
  return result;
}

async function benchmarkSequential(data: number[]): Promise<number> {
  const start = performance.now();
  data.map(item => processData(item));
  const end = performance.now();
  return end - start;
}

async function benchmarkParallel(data: number[], poolSize: number): Promise<number> {
  const pool = new ThreadPool(poolSize);
  const start = performance.now();

  await pool.map(data, (item: number) => {
    let result = item;
    for (let i = 0; i < 500000; i++) {
      result = Math.sqrt(result + i) * Math.sin(i) * Math.cos(result);
    }
    return result;
  });

  const end = performance.now();
  await pool.terminate();
  return end - start;
}

async function runBenchmark() {
  console.log('🚀 Бенчмарк: Обработка массива данных\n');

  const size = 50;
  const poolSize = 4;
  const data = Array.from({ length: size }, (_, i) => i + 1);

  console.log(`📊 Задача: обработка ${size} элементов\n`);

  // Последовательное выполнение
  console.log('⏱️  Последовательное выполнение...');
  const seqTime = await benchmarkSequential(data);
  console.log(`   Время: ${seqTime.toFixed(2)} мс\n`);

  // Параллельное выполнение
  console.log(`⚡ Параллельное выполнение (${poolSize} потоков)...`);
  const parTime = await benchmarkParallel(data, poolSize);
  const speedup = (seqTime / parTime).toFixed(2);
  const improvement = (((seqTime - parTime) / seqTime) * 100).toFixed(1);

  console.log(`   Время: ${parTime.toFixed(2)} мс`);
  console.log(`\n✨ Результат:`);
  console.log(`   🔥 Ускорение: ${speedup}x`);
  console.log(`   📈 Улучшение: ${improvement}%`);
}

runBenchmark().catch(console.error);
