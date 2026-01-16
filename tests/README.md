# Tests

Этот каталог содержит все тесты для библиотеки parallel.js.

## Структура

```
tests/
├── helpers/          # Helper функции для тестов
│   ├── performance.ts  # Утилиты для performance и flaky tests
│   └── index.ts        # Экспорты
├── *.test.ts         # Тестовые файлы
└── README.md         # Этот файл
```

## Запуск тестов

```bash
# Все тесты
npm test

# Конкретный файл
npm test -- Queue.test.ts

# С coverage
npm test -- --coverage

# Один тест (by name)
npm test -- --testNamePattern="should enqueue"

# Watch mode
npm test -- --watch
```

## Написание тестов

### Базовая структура

```typescript
import { Queue } from '../src/datastructures/Queue';

describe('Queue', () => {
    let queue: Queue<number>;

    beforeEach(() => {
        queue = new Queue<number>();
    });

    it('should do something', () => {
        queue.enqueue(1);
        expect(queue.dequeue()).toBe(1);
    });
});
```

### Асинхронные тесты

```typescript
import { waitFor, withTimeout } from './helpers';

it('should handle async operations', async () => {
    const thread = createThread();
    
    // Ждем условия вместо setTimeout
    await waitFor(() => thread.isReady, { timeout: 5000 });
    
    expect(thread.isReady).toBe(true);
});

it('should timeout long operations', async () => {
    const result = await withTimeout(
        () => thread.execute(task),
        10000
    );
    expect(result).toBeDefined();
});
```

### Performance тесты

```typescript
import { measureMedian } from './helpers';

it('should be fast', () => {
    // Используем медиану для стабильности
    const time = measureMedian(() => {
        queue.enqueue(1);
        queue.dequeue();
    }, 5);
    
    // Проверяем общее время, не среднее
    expect(time).toBeLessThan(10);
});

it('should handle large dataset', () => {
    const n = 100000;
    const start = performance.now();
    
    for (let i = 0; i < n; i++) {
        queue.enqueue(i);
    }
    
    const totalTime = performance.now() - start;
    
    // Проверяем total time - более стабильно
    expect(totalTime).toBeLessThan(100);
});
```

## Best Practices

### ✅ DO:

- Используйте `waitFor()` вместо `setTimeout()` для async операций
- Проверяйте total time вместо average time в performance тестах
- Изолируйте тесты - каждый тест независимый
- Используйте `beforeEach()` для setup, `afterEach()` для cleanup
- Пишите понятные названия тестов
- Используйте helper функции из `./helpers/`

### ❌ DON'T:

- Не используйте `Math.random()` или `Date.now()` в тестовых данных
- Не пишите flaky тесты (если тест иногда падает - исправьте его)
- Не полагайтесь на execution order тестов
- Не используйте жесткие timeouts без необходимости
- Не смешивайте unit и integration тесты

## Отладка тестов

### Запуск одного теста

```typescript
it.only('should test this specific case', () => {
    // Только этот тест запустится
});
```

### Пропуск теста

```typescript
it.skip('should test this later', () => {
    // Этот тест будет пропущен
});
```

### Debugging в VS Code

1. Установите breakpoint в тесте
2. Запустите "Debug Test" из Code Lens
3. Или используйте конфигурацию launch.json:

```json
{
    "type": "node",
    "request": "launch",
    "name": "Jest Debug",
    "program": "${workspaceFolder}/node_modules/jest/bin/jest",
    "args": ["--runInBand", "--no-cache"],
    "console": "integratedTerminal"
}
```

### Логирование

```typescript
it('should work', () => {
    console.log('State:', queue.size());
    queue.enqueue(1);
    console.log('After enqueue:', queue.size());
    
    expect(queue.size()).toBe(1);
});
```

## Helper функции

Все helper функции доступны в `./helpers/`:

### Performance измерения
- `measureWithWarmup(fn, warmupRuns)` - измерение с warm-up
- `measureMedian(fn, runs)` - медианное время
- `measurePercentile(fn, runs, percentile)` - p95, p99 метрики
- `verifyComplexity(createTest, sizes, maxGrowthRatio)` - проверка сложности

### Async утилиты
- `waitFor(condition, options)` - ожидание условия
- `withTimeout(fn, timeout)` - Promise с timeout
- `sleep(ms)` - async задержка

### Retry
- `retryFlaky(fn, maxRetries, delayMs)` - retry для flaky тестов

## Coverage

Coverage отчеты генерируются в `./coverage/`:

```bash
npm test -- --coverage
```

Открыть HTML отчет:
```bash
# Windows
start coverage/lcov-report/index.html

# Linux/Mac
open coverage/lcov-report/index.html
```

## CI/CD

В CI запускаются все тесты:

```bash
npm test -- --maxWorkers=2 --runInBand
```

Для подробностей смотрите:
- [Testing Best Practices](../docs/TESTING_BEST_PRACTICES.md)
- [CI Flaky Tests Strategies](../docs/CI_FLAKY_TESTS.md)

## Troubleshooting

### Тесты падают нестабильно (flaky)

1. Проверьте что вы используете `waitFor()` вместо `setTimeout()`
2. Увеличьте timeout для async операций
3. Проверьте что тесты изолированы (используйте `beforeEach`)
4. Запустите тест 50 раз локально чтобы воспроизвести

```bash
# PowerShell
1..50 | ForEach-Object { npm test -- --testNamePattern="flaky test"; if ($LASTEXITCODE -ne 0) { break } }
```

### Performance тесты падают в CI

1. Используйте total time вместо average time
2. Используйте более мягкие пороги (2-3x запас)
3. Используйте `measureMedian()` вместо прямого замера
4. Рассмотрите вынос в отдельный test suite

### Out of memory

```bash
# Увеличьте heap size
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

## Полезные ссылки

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Test Coverage Guide](https://istanbul.js.org/)
