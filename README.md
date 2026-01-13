# parallel.js

Библиотека для параллельного выполнения JavaScript/TypeScript функций с использованием Worker Threads в Node.js.

## Возможности

- ✨ Простой API для параллельного выполнения функций
- 🔄 Пул потоков для эффективного управления ресурсами
- 🚀 Отдельные потоки для разовых задач
- 📦 TypeScript поддержка из коробки
- 🛡️ Автоматическое восстановление упавших потоков
- ⚡ Асинхронная обработка задач с очередью

## Установка

```bash
npm install parallel.js
# или
pnpm install parallel.js
# или
yarn add parallel.js
```

## Использование

### ThreadPool - Пул потоков

Используйте `ThreadPool` для выполнения множества задач с ограниченным количеством потоков:

```typescript
import { ThreadPool } from 'parallel.js';

// Создаем пул из 4 потоков
const pool = new ThreadPool(4);

// Выполнение одной задачи
const result = await pool.execute(
  (n: number) => {
    // Тяжелые вычисления
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  },
  [1000000]
);

console.log(result);

// Параллельная обработка массива
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];
const squares = await pool.map(numbers, (n: number) => n * n);
console.log(squares); // [1, 4, 9, 16, 25, 36, 49, 64]

// Не забудьте остановить пул
await pool.terminate();
```

### Thread - Отдельный поток

Используйте `Thread` для разовых задач:

```typescript
import { Thread } from 'parallel.js';

// Создаем поток для выполнения функции
const thread = new Thread(
  (text: string) => {
    return text.toUpperCase();
  },
  ['hello world']
);

// Ждем результат
const result = await thread.join();
console.log(result); // "HELLO WORLD"

// Стрелочные функции также поддерживаются
const thread2 = new Thread(x => x * 2, [21]);
const result2 = await thread2.join();
console.log(result2); // 42
```

## API

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

## Примеры

### Обработка больших данных

```typescript
import { ThreadPool } from 'parallel.js';

const pool = new ThreadPool(8);

const data = Array.from({ length: 10000 }, (_, i) => i);

const processed = await pool.map(data, (item: number) => {
  // Сложная обработка каждого элемента
  return Math.sin(item) * Math.cos(item);
});
### Вычисление чисел Фибоначчи

```typescript
import { ThreadPool } from 'parallel.js';

const pool = new ThreadPool(4);

const numbers = [35, 36, 37, 38, 39, 40];

const results = await pool.map(numbers, n => {
  function fibonacci(num) {
    if (num <= 1) return num;
    return fibonacci(num - 1) + fibonacci(num - 2);
  }
  return fibonacci(n);
});

console.log(results); // [9227465, 14930352, 24157817, ...]

await pool.terminate();
```

### Использование встроенных модулей Node.js

```typescript
import { ThreadPool } from 'parallel.js';

const pool = new ThreadPool(4);

// require() доступен внутри функций
const result = await pool.execute(() => {
  const fs = require('fs');
  const path = require('path');
  return path.join('folder', 'file.txt');
});

console.log(result); // 'folder/file.txt' или 'folder\\file.txt'

await pool.terminate();
```eturn response.json();
});

await pool.terminate();
```

## Важные замечания

- 🔒 Функции, передаваемые в потоки, выполняются в изолированном контексте
- 📦 Все аргументы и результаты должны быть сериализуемыми (передаются через структурированное клонирование)
- 🚫 Нельзя использовать замыкания - функции не имеют доступа к внешним переменным из основного потока
- ✅ Поддерживаются как обычные функции (`function`), так и стрелочные (`=>`)
- ✅ `require()` и встроенные модули Node.js доступны внутри функций
- ⚡ Worker Threads лучше всего подходят для CPU-интенсивных задач

## Требования

- Node.js >= 14.0.0 (с поддержкой Worker Threads)

## Лицензия

ISC

## Разработка

```bash
# Установка зависимостей
pnpm install

# Запуск тестов
pnpm test

# Сборка
pnpm build
```
