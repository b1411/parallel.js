import { Thread } from "../src/index";

async function main() {
    console.log("🚀 Запуск примера с потоками...\n");

    // Поток 1: Вычисление чисел Фибоначчи (CPU-интенсивная задача)
    console.log("⏳ Запускаем вычисление числа Фибоначчи 40 в отдельном потоке...");
    const fibThread = new Thread(function (n: number) {
        function fibonacci(num: number): number {
            if (num <= 1) return num;
            return fibonacci(num - 1) + fibonacci(num - 2);
        }

        const start = Date.now();
        const result = fibonacci(n);
        const duration = Date.now() - start;

        return { result, duration };
    }, [40]);

    // Поток 2: Подсчет простых чисел (CPU-интенсивная задача)
    console.log("⏳ Запускаем поиск простых чисел до 1,000,000 в отдельном потоке...");
    const primeThread = new Thread(function (limit: number) {
        function isPrime(num: number): boolean {
            if (num < 2) return false;
            if (num === 2) return true;
            if (num % 2 === 0) return false;

            const sqrt = Math.sqrt(num);
            for (let i = 3; i <= sqrt; i += 2) {
                if (num % i === 0) return false;
            }
            return true;
        }

        const start = Date.now();
        let count = 0;
        for (let i = 2; i <= limit; i++) {
            if (isPrime(i)) count++;
        }
        const duration = Date.now() - start;

        return { count, duration };
    }, [1000000]);

    // Поток 3: Сортировка большого массива (CPU-интенсивная задача)
    console.log("⏳ Запускаем сортировку 1,000,000 чисел в отдельном потоке...");
    const sortThread = new Thread(function (size: number) {
        const start = Date.now();

        // Генерируем случайный массив
        const arr: number[] = [];
        for (let i = 0; i < size; i++) {
            arr.push(Math.floor(Math.random() * 1000000));
        }

        // Сортируем
        arr.sort(function (a, b) { return a - b; });

        const duration = Date.now() - start;
        return {
            size: arr.length,
            min: arr[0],
            max: arr[arr.length - 1],
            duration
        };
    }, [1000000]);

    console.log("\n⏰ Главный поток продолжает работу, пока потоки выполняются...");
    console.log("✅ Главный поток свободен для других задач!");

    // Показываем, что главный поток не заблокирован
    let dots = 0;
    const interval = setInterval(function () {
        process.stdout.write(".");
        dots++;
        if (dots >= 50) {
            clearInterval(interval);
            console.log("\n");
        }
    }, 100);

    // Ждем результаты от всех потоков
    console.log("\n🔄 Ожидаем результаты от потоков...\n");

    const fibResult = await fibThread.join();
    console.log(`✨ Фибоначчи(40) = ${fibResult.result} (выполнено за ${fibResult.duration}мс)`);

    const primeResult = await primeThread.join();
    console.log(`✨ Найдено ${primeResult.count} простых чисел до 1,000,000 (выполнено за ${primeResult.duration}мс)`);

    const sortResult = await sortThread.join();
    console.log(`✨ Отсортировано ${sortResult.size} чисел, min=${sortResult.min}, max=${sortResult.max} (выполнено за ${sortResult.duration}мс)`);

    clearInterval(interval);
    console.log("\n🎉 Все потоки завершены!");
}

main();