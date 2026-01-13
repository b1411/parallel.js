import { ThreadPool } from "../src/index";

async function main() {
    console.log("🚀 Запуск примера с пулом потоков...\n");

    // Создаем пул из 4 потоков
    const pool = new ThreadPool(4);
    console.log(`✅ Создан пул из ${pool.getStats().totalWorkers} потоков\n`);

    // Задача 1: Вычисление чисел Фибоначчи для массива значений
    console.log("⏳ Вычисляем числа Фибоначчи параллельно...");
    const fibNumbers = [35, 36, 37, 38, 39, 40];

    const fibStart = Date.now();
    const fibResults = await pool.map(fibNumbers, function (n: number) {
        function fibonacci(num: number): number {
            if (num <= 1) return num;
            return fibonacci(num - 1) + fibonacci(num - 2);
        }
        return { n, result: fibonacci(n), duration: Date.now() };
    });
    const fibDuration = Date.now() - fibStart;

    console.log("✨ Результаты Фибоначчи:");
    fibResults.forEach(({ n, result }: { n: number; result: number; duration: number }) => {
        console.log(`   Фибоначчи(${n}) = ${result}`);
    });
    console.log(`   ⏱️  Общее время: ${fibDuration}мс\n`);

    // Задача 2: Проверка массива чисел на простоту
    console.log("⏳ Проверяем числа на простоту параллельно...");
    const numbersToCheck = [
        104729, 104743, 104759, 104761, 104773, 104779,
        104789, 104801, 104803, 104827, 104831, 104849
    ];

    const primeStart = Date.now();
    const primeResults = await pool.map(numbersToCheck, function (num: number) {
        function isPrime(n: number): boolean {
            if (n < 2) return false;
            if (n === 2) return true;
            if (n % 2 === 0) return false;

            const sqrt = Math.sqrt(n);
            for (let i = 3; i <= sqrt; i += 2) {
                if (n % i === 0) return false;
            }
            return true;
        }
        return { num, isPrime: isPrime(num) };
    });
    const primeDuration = Date.now() - primeStart;

    console.log("✨ Результаты проверки на простоту:");
    primeResults.forEach(({ num, isPrime }: { num: number; isPrime: boolean }) => {
        console.log(`   ${num}: ${isPrime ? '✓ Простое' : '✗ Составное'}`);
    });
    console.log(`   ⏱️  Общее время: ${primeDuration}мс\n`);

    // Задача 3: Факториал для массива чисел
    console.log("⏳ Вычисляем факториалы параллельно...");
    const factorialNumbers = [10, 15, 20, 25, 30, 35, 40, 45];

    const factStart = Date.now();
    const factResults = await pool.map(factorialNumbers, function (n: number) {
        function factorial(num: number): number {
            if (num <= 1) return 1;
            let result = 1;
            for (let i = 2; i <= num; i++) {
                result *= i;
            }
            return result;
        }
        return { n, result: factorial(n) };
    });
    const factDuration = Date.now() - factStart;

    console.log("✨ Результаты факториалов:");
    factResults.forEach(({ n, result }: { n: number; result: number; }) => {
        console.log(`   ${n}! = ${result.toExponential(2)}`);
    });
    console.log(`   ⏱️  Общее время: ${factDuration}мс\n`);

    // Задача 4: Обработка текста (подсчет слов и символов)
    console.log("⏳ Обрабатываем тексты параллельно...");
    const texts = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
        "Duis aute irure dolor in reprehenderit in voluptate velit.",
        "Excepteur sint occaecat cupidatat non proident sunt in culpa.",
        "Mollit anim id est laborum et dolorum fuga et harum quidem.",
    ];

    const textStart = Date.now();
    const textResults = await pool.map(texts, function (text: string) {
        const words = text.split(/\s+/).length;
        const chars = text.length;
        const vowels = (text.match(/[aeiouAEIOU]/g) || []).length;
        const consonants = (text.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;

        return {
            preview: text.substring(0, 30) + "...",
            words,
            chars,
            vowels,
            consonants
        };
    });
    const textDuration = Date.now() - textStart;

    console.log("✨ Результаты обработки текста:");
    textResults.forEach(({ preview, words, chars, vowels, consonants }: {
        preview: string; words: number; chars: number; vowels: number; consonants: number;
    }) => {
        console.log(`   "${preview}"`);
        console.log(`      Слов: ${words}, Символов: ${chars}, Гласных: ${vowels}, Согласных: ${consonants}`);
    });
    console.log(`   ⏱️  Общее время: ${textDuration}мс\n`);

    // Показываем статистику пула
    console.log("📊 Статистика пула потоков:");
    const stats = pool.getStats();
    console.log(`   Всего потоков: ${stats.totalWorkers}`);
    console.log(`   Доступных: ${stats.availableWorkers}`);
    console.log(`   Занятых: ${stats.busyWorkers}`);
    console.log(`   В очереди: ${stats.queuedTasks}`);

    // Массивная параллельная обработка
    console.log("\n⚡ Тест производительности: 100 задач параллельно...");
    const massiveTasks = Array.from({ length: 100 }, (_, i) => i + 1);

    const massiveStart = Date.now();
    const massiveResults = await pool.map(massiveTasks, function (num: number) {
        // Искусственная CPU-интенсивная задача
        let sum = 0;
        for (let i = 0; i < num * 100000; i++) {
            sum += Math.sqrt(i);
        }
        return { num, sum };
    });
    const massiveDuration = Date.now() - massiveStart;

    console.log(`✨ Обработано ${massiveResults.length} задач за ${massiveDuration}мс`);
    console.log(`   Среднее время на задачу: ${(massiveDuration / massiveResults.length).toFixed(2)}мс`);

    // Завершаем работу пула
    console.log("\n🔚 Завершаем работу пула потоков...");
    await pool.terminate();
    console.log("🎉 Пул потоков успешно завершен!");
}

main().catch(console.error);
