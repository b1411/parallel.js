import { Thread } from "../src/Thread.js";
import { ThreadPool } from "../src/ThreadPool.js";

async function main() {
    console.log("🎯 Тестирование стрелочных функций\n");

    // Тест 1: Стрелочная функция с одним параметром
    console.log("1️⃣ Стрелочная функция (x => x * 2):");
    const thread1 = new Thread(x => x * 2, [21]);
    const result1 = await thread1.join();
    console.log(`   Результат: ${result1}\n`);

    // Тест 2: Стрелочная функция с несколькими параметрами
    console.log("2️⃣ Стрелочная функция ((a, b) => a + b):");
    const thread2 = new Thread((a, b) => a + b, [10, 32]);
    const result2 = await thread2.join();
    console.log(`   Результат: ${result2}\n`);

    // Тест 3: Стрелочная функция с блоком кода
    console.log("3️⃣ Стрелочная функция с блоком:");
    const thread3 = new Thread((n) => {
        let sum = 0;
        for (let i = 1; i <= n; i++) {
            sum += i;
        }
        return sum;
    }, [100]);
    const result3 = await thread3.join();
    console.log(`   Сумма от 1 до 100: ${result3}\n`);

    // Тест 4: Обычная функция (для сравнения)
    console.log("4️⃣ Обычная function:");
    const thread4 = new Thread(function(x) { return x ** 3; }, [5]);
    const result4 = await thread4.join();
    console.log(`   5^3 = ${result4}\n`);

    // Тест 5: ThreadPool с map и стрелочными функциями
    console.log("5️⃣ ThreadPool.map() со стрелочной функцией:");
    const pool = new ThreadPool(4);
    const numbers = [1, 2, 3, 4, 5];
    const squares = await pool.map(numbers, x => x * x);
    console.log(`   Квадраты [${numbers}]: [${squares}]\n`);
    pool.terminate();

    console.log("✅ Все тесты пройдены!");
}

main().catch(console.error);
