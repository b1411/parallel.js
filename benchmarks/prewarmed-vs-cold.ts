import { ThreadV2 } from "../src/index.js";

// CPU-интенсивная задача для тестирования
function calculatePrimes(max: number): number[] {
  const primes: number[] = [];
  for (let i = 2; i <= max; i++) {
    let isPrime = true;
    for (let j = 2; j <= Math.sqrt(i); j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(i);
  }
  return primes;
}

async function benchmarkColdStart(iterations: number): Promise<number> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Очищаем пул перед каждым запуском, чтобы гарантировать холодный старт
    ThreadV2.clearPool();
    
    const start = performance.now();
    const result = await ThreadV2.execute((max: number) => {
      const primes: number[] = [];
      for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
          if (i % j === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(i);
      }
      return primes;
    }, [10000]).join();
    const end = performance.now();
    
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  return avgTime;
}

async function benchmarkPrewarmed(iterations: number, poolSize: number): Promise<number> {
  // Предварительно прогреваем пул воркеров
  ThreadV2.prewarm(poolSize);
  
  // Небольшая задержка, чтобы воркеры успели инициализироваться
  await new Promise(resolve => setTimeout(resolve, 100));

  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await ThreadV2.execute((max: number) => {
      const primes: number[] = [];
      for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
          if (i % j === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(i);
      }
      return primes;
    }, [10000]).join();
    const end = performance.now();
    
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  
  // Очищаем пул после теста
  ThreadV2.clearPool();
  
  return avgTime;
}

async function benchmarkMultipleTasks(taskCount: number, poolSize: number): Promise<{ cold: number, prewarmed: number }> {
  // Cold start - множественные задачи
  ThreadV2.clearPool();
  const coldStart = performance.now();
  const coldPromises = Array.from({ length: taskCount }, (_, i) => 
    ThreadV2.execute((max: number) => {
      const primes: number[] = [];
      for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
          if (i % j === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(i);
      }
      return primes;
    }, [5000 + i * 100]).join()
  );
  await Promise.all(coldPromises);
  const coldTime = performance.now() - coldStart;

  ThreadV2.clearPool();
  await new Promise(resolve => setTimeout(resolve, 100));

  // Prewarmed - множественные задачи
  ThreadV2.prewarm(poolSize);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const prewarmStart = performance.now();
  const prewarmPromises = Array.from({ length: taskCount }, (_, i) => 
    ThreadV2.execute((max: number) => {
      const primes: number[] = [];
      for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
          if (i % j === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(i);
      }
      return primes;
    }, [5000 + i * 100]).join()
  );
  await Promise.all(prewarmPromises);
  const prewarmTime = performance.now() - prewarmStart;

  ThreadV2.clearPool();

  return { cold: coldTime, prewarmed: prewarmTime };
}

async function runBenchmark() {
  console.log('🚀 Бенчмарк: Prewarmed vs Cold Start (ThreadV2.execute)\n');
  console.log('═'.repeat(60));

  const iterations = 10;
  const poolSize = 4;

  // Тест 1: Одиночные последовательные вызовы
  console.log('\n📊 Тест 1: Одиночные последовательные вызовы');
  console.log(`   Итераций: ${iterations}\n`);

  console.log('❄️  Cold Start (без предварительного прогрева)...');
  const coldTime = await benchmarkColdStart(iterations);
  console.log(`   Среднее время: ${coldTime.toFixed(2)} мс\n`);

  console.log(`🔥 Prewarmed (пул из ${poolSize} воркеров)...`);
  const prewarmTime = await benchmarkPrewarmed(iterations, poolSize);
  console.log(`   Среднее время: ${prewarmTime.toFixed(2)} мс\n`);

  const improvement = ((coldTime - prewarmTime) / coldTime * 100).toFixed(1);
  const speedup = (coldTime / prewarmTime).toFixed(2);
  
  console.log('📈 Результаты:');
  console.log(`   Улучшение: ${improvement}%`);
  console.log(`   Ускорение: ${speedup}x`);
  console.log(`   Экономия времени: ${(coldTime - prewarmTime).toFixed(2)} мс на запрос`);

  // Тест 2: Множественные параллельные задачи
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Тест 2: Множественные параллельные задачи');
  const taskCount = 20;
  console.log(`   Задач: ${taskCount}`);
  console.log(`   Размер пула: ${poolSize}\n`);

  const multiResults = await benchmarkMultipleTasks(taskCount, poolSize);
  
  console.log('❄️  Cold Start:');
  console.log(`   Общее время: ${multiResults.cold.toFixed(2)} мс`);
  console.log(`   Время на задачу: ${(multiResults.cold / taskCount).toFixed(2)} мс\n`);

  console.log('🔥 Prewarmed:');
  console.log(`   Общее время: ${multiResults.prewarmed.toFixed(2)} мс`);
  console.log(`   Время на задачу: ${(multiResults.prewarmed / taskCount).toFixed(2)} мс\n`);

  const multiImprovement = ((multiResults.cold - multiResults.prewarmed) / multiResults.cold * 100).toFixed(1);
  const multiSpeedup = (multiResults.cold / multiResults.prewarmed).toFixed(2);
  
  console.log('📈 Результаты:');
  console.log(`   Улучшение: ${multiImprovement}%`);
  console.log(`   Ускорение: ${multiSpeedup}x`);
  console.log(`   Экономия времени: ${(multiResults.cold - multiResults.prewarmed).toFixed(2)} мс`);

  console.log('\n' + '═'.repeat(60));
  console.log('\n💡 Выводы:');
  console.log('   • Prewarmed режим устраняет overhead создания воркеров');
  console.log('   • Наибольшая выгода при множественных коротких задачах');
  console.log('   • Рекомендуется использовать prewarm() в начале приложения');
  console.log('   • Особенно эффективно для серверных приложений\n');
}

runBenchmark().catch(console.error);
