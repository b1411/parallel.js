# ⚡ stardust-parallel-js

[![npm version](https://img.shields.io/npm/v/stardust-parallel-js.svg)](https://www.npmjs.com/package/stardust-parallel-js)
[![npm downloads](https://img.shields.io/npm/dm/stardust-parallel-js.svg)](https://www.npmjs.com/package/stardust-parallel-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/b1411/5e96225d1a326e23a38edc41799b1ead/raw/coverage.json)](https://github.com/b1411/parallel.js)
[![Node.js Version](https://img.shields.io/node/v/stardust-parallel-js.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/stardust-parallel-js)](https://bundlephobia.com/package/stardust-parallel-js)
[![GitHub stars](https://img.shields.io/github/stars/b1411/parallel.js.svg?style=social)](https://github.com/b1411/parallel.js)

> **Другие языки:** [English](./README.md)

Библиотека для параллельного выполнения JavaScript/TypeScript функций с использованием Worker Threads в Node.js.

## Производительность

Бенчмарки на 4-ядерном CPU:

| Задача | Последовательно | Параллельно (4 потока) | Ускорение |
|--------|----------------|------------------------|-----------|
| **Вычисление Fibonacci(35-42)** | 5113 мс | 2606 мс | **1.96x** |
| **Обработка 50 элементов** | 936 мс | 344 мс | **2.72x** |

> Улучшение производительности: до 63% на CPU-интенсивных задачах.

## Возможности

- Реальное ускорение на многоядерных процессорах
- Простой API для параллельного выполнения задач
- Пул потоков для эффективного управления ресурсами
- Поддержка отдельных потоков для разовых задач
- Полная поддержка TypeScript
- Автоматическое восстановление упавших потоков
- Обработка массивов аналогично `map()`, но параллельно

## Установка

```bash
npm install stardust-parallel-js
# или
pnpm install stardust-parallel-js
# или
yarn add stardust-parallel-js
```

## Быстрый старт

Пример базового использования:

```typescript
import { ThreadPool } from 'stardust-parallel-js';

const pool = new ThreadPool(4);

// Последовательное выполнение
const results = data.map(item => heavyComputation(item));

// Параллельное выполнение
const results = await pool.map(data, item => heavyComputation(item));

await pool.terminate();
```

## Использование

### ThreadPool - Пул потоков (рекомендуется)

Используйте `ThreadPool` для обработки множества задач с максимальной эффективностью:

```typescript
import { ThreadPool } from 'stardust-parallel-js';

// Создаем пул из 4 потоков (по числу ядер CPU)
const pool = new ThreadPool(4);

// Обработка массива параллельно
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
const squares = await pool.map(numbers, (n: number) => n * n);
console.log(squares); // [1, 4, 9, 16, 25, 36, 49, 64]

// CPU-интенсивные вычисления
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

// Освобождаем ресурсы
await pool.terminate();
```

### Thread - Отдельный поток (для простых задач)

Используйте `Thread` для разовых операций:

```typescript
import { Thread } from 'stardust-parallel-js';

// Запустить и дождаться результата
const thread = new Thread(
  (text: string) => text.toUpperCase(),
  ['hello world']
);

const result = await thread.join();
console.log(result); // "HELLO WORLD"

// Стрелочные функции работают!
const thread2 = new Thread(x => x * 2, [21]);
console.log(await thread2.join()); // 42
```

## Примеры

### Обработка изображений

```typescript
import { ThreadPool } from 'stardust-parallel-js';

const pool = new ThreadPool(8);
const images = ['img1.jpg', 'img2.jpg', /* ... */ 'img100.jpg'];

// Обрабатываем 100 изображений параллельно
const processed = await pool.map(images, (path: string) => {
  const fs = require('fs');
  const sharp = require('sharp');
  // Сложная обработка изображения
  return processImage(path);
});

await pool.terminate();
```

### Парсинг больших данных

```typescript
const pool = new ThreadPool(4);
const chunks = splitDataIntoChunks(bigData, 1000);

// Парсим каждый чунк параллельно
const parsed = await pool.map(chunks, (chunk: any[]) => {
  return chunk.map(item => parseComplexData(item));
});

await pool.terminate();
```

### Вычисления и аналитика

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

## Бенчмарки

Запуск бенчмарков:

```bash
npm run build
npx tsx benchmarks/cpu-intensive.ts
npx tsx benchmarks/data-processing.ts
```

## API Reference

### ThreadPool

#### `constructor(size: number)`
Создает пул потоков заданного размера.

```typescript
const pool = new ThreadPool(4);
```

#### `execute<TArgs, TResult>(fn: (...args: TArgs) => TResult, args?: TArgs): Promise<TResult>`
Выполняет функцию в доступном потоке из пула.

```typescript
const result = await pool.execute(
#### `map<T, R>(items: T[], fn: (item: T) => R): Promise<R[]>`
Применяет функцию к каждому элементу массива параллельно.

```typescript
// Стрелочная функция
const results = await pool.map([1, 2, 3], n => n * 2);

// Обычная функция
const results2 = await pool.map([1, 2, 3], function(n) { return n * 2; });
```# `map<T, R>(items: T[], fn: (item: T) => R): Promise<R[]>`
Применяет функцию к каждому элементу массива параллельно.

```typescript
const results = await pool.map([1, 2, 3], (n) => n * 2);
```

#### `terminate(): Promise<void>`
Останавливает все потоки и освобождает ресурсы.

```typescript
await pool.terminate();
```

### Thread

#### `constructor<T, TArgs>(fn: (...args: TArgs) => T, args?: TArgs)`
Создает новый поток для выполнения функции.

```typescript
const thread = new Thread((x: number) => x * x, [5]);
```

#### `join(): Promise<T>`
Ожидает завершения выполнения и возвращает результат. Автоматически завершает поток.

```typescript
const result = await thread.join();
```

## Важные замечания

- Функции выполняются в изолированном контексте (отдельный Worker Thread)
- Аргументы и результаты должны быть сериализуемыми
- Замыкания не работают - функции не имеют доступа к внешним переменным
- Поддерживаются обычные и стрелочные функции
- `require()` доступен внутри функций для использования Node.js модулей
- Лучше всего подходит для CPU-интенсивных задач (вычисления, обработка данных)
- Для I/O операций (чтение файлов, сеть) используйте async/await вместо потоков

## Когда использовать

**Используйте stardust-parallel-js когда:**
- Обрабатываете большие массивы данных
- Выполняете сложные вычисления
- Парсите или трансформируете данные
- Обрабатываете изображения/видео
- Нужно использовать все ядра CPU

**Не используйте когда:**
- Простые операции (быстрее выполнить последовательно)
- I/O операции (файлы, сеть, БД) - они уже асинхронные
- Работаете с DOM (только в Node.js)

## Выбор размера пула

```typescript
import os from 'os';

// Оптимально: количество CPU ядер
const pool = new ThreadPool(os.cpus().length);

// Для CPU-интенсивных задач
const pool = new ThreadPool(os.cpus().length - 1); // оставить 1 ядро для системы

// Для смешанной нагрузки
const pool = new ThreadPool(os.cpus().length * 2);
```

## Сравнение с альтернативами

| Решение | Простота | Производительность | TypeScript | Размер |
|---------|----------|-------------------|------------|--------|
| **stardust-parallel-js** | Высокая | Высокая | Полная | 9.3kB |
| worker_threads | Средняя | Высокая | Частичная | Встроено |
| cluster | Средняя | Средняя | Частичная | Встроено |
| child_process | Низкая | Низкая | Нет | Встроено |

## Roadmap

- [ ] Поддержка transferable objects для больших данных
- [ ] Автоматический выбор оптимального размера пула
- [ ] Приоритизация задач
- [ ] Мониторинг и статистика
- [ ] Поддержка async функций в потоках

## Обратная связь

Нашли баг или есть идея? [Создайте issue](https://github.com/b1411/parallel.js).

## Требования

- Node.js >= 14.0.0 (с поддержкой Worker Threads)

## Лицензия

MIT © [b1411](https://github.com/b1411)

---

<p align="center">
  Сделано с ❤️ для Node.js сообщества
</p>


