# Testing Best Practices

## Борьба с Flaky Tests

### Что такое Flaky Tests?
Flaky tests - это тесты, которые могут падать непредсказуемо при одинаковых условиях. Основные причины:

1. **Race conditions** - условия гонки в асинхронном коде
2. **Performance variance** - зависимость от загрузки CPU/памяти
3. **Timing issues** - проблемы с таймаутами и задержками
4. **External dependencies** - зависимость от сети, файловой системы и т.д.
5. **Non-deterministic behavior** - недетерминированное поведение

### Типичные проблемы и решения

#### 1. Performance тесты

**❌ ПЛОХО:**
```typescript
it('should be fast', () => {
    const start = performance.now();
    doSomething();
    const end = performance.now();
    const timePerOp = (end - start) / n;
    
    // Flaky! Зависит от загрузки системы
    expect(timePerOp).toBeLessThan(0.02);
});
```

**✅ ХОРОШО:**
```typescript
it('should be fast', () => {
    const start = performance.now();
    doSomething();
    const end = performance.now();
    const totalTime = end - start;
    
    // Проверяем общее время - более стабильно
    expect(totalTime).toBeLessThan(100);
});
```

**✅ ЕЩЕ ЛУЧШЕ:**
```typescript
import { measureMedian } from '../helpers/performance';

it('should be fast', () => {
    // Используем медиану из нескольких запусков
    const time = measureMedian(() => doSomething(), 3);
    expect(time).toBeLessThan(100);
});
```

#### 2. Асинхронные тесты с таймаутами

**❌ ПЛОХО:**
```typescript
it('should process async task', async () => {
    const promise = processTask();
    await new Promise(resolve => setTimeout(resolve, 100));
    // Flaky! Задача может не успеть завершиться
    expect(isComplete()).toBe(true);
});
```

**✅ ХОРОШО:**
```typescript
it('should process async task', async () => {
    await processTask();
    expect(isComplete()).toBe(true);
});
```

**✅ С POLLING (для событийно-ориентированного кода):**
```typescript
import { waitFor } from '../helpers/performance';

it('should process async task', async () => {
    processTask(); // не ждем Promise
    
    // Ждем пока условие не выполнится
    await waitFor(() => isComplete(), {
        timeout: 5000,
        interval: 100,
        message: 'Task did not complete'
    });
    
    expect(isComplete()).toBe(true);
});
```

**✅ С TIMEOUT (защита от зависаний):**
```typescript
import { withTimeout } from '../helpers/performance';

it('should complete within timeout', async () => {
    // Автоматически упадет если превысит 5 секунд
    const result = await withTimeout(
        () => processLongTask(),
        5000
    );
    
    expect(result).toBeDefined();
});
```
```

#### 3. Тесты с очередями и параллелизмом

**✅ ПРАВИЛЬНЫЙ ПОДХОД:**
```typescript
it('should handle concurrent operations', async () => {
    const results: number[] = [];
    const promises: Promise<void>[] = [];
    
    // Запускаем параллельно
    for (let i = 0; i < 100; i++) {
        promises.push(
            queue.enqueue(i).then(() => {
                results.push(i);
            })
        );
    }
    
    // Ждем все операции
    await Promise.all(promises);
    
    // Проверяем результат
    expect(results).toHaveLength(100);
    expect(new Set(results).size).toBe(100); // Все уникальные
});
```

#### 4. Retry для действительно flaky тестов

Используйте только если нельзя починить по-другому:

```typescript
import { retryFlaky } from '../helpers/performance';

it('external API call', async () => {
    await retryFlaky(async () => {
        const result = await callExternalAPI();
        expect(result).toBeDefined();
    }, 3, 1000);
});
```

### Рекомендации по Performance тестам

1. **Warm-up runs** - делайте прогревочные запуски перед замером
2. **Медиана вместо среднего** - медиана устойчива к выбросам
3. **Общее время вместо среднего** - проверяйте total time, а не time per operation
4. **Мягкие границы** - используйте запас в 2-3x для временных ограничений
5. **Complexity checks вместо absolute time** - проверяйте что время растет правильно, а не абсолютные значения

### Общие правила

1. **Изоляция** - каждый тест должен быть независимым
   ```typescript
   beforeEach(() => {
       queue = new Queue(); // Создаем новый экземпляр
   });
   ```

2. **Детерминизм** - избегайте `Math.random()`, `Date.now()` в тестовых данных
   ```typescript
   // Используйте seed или фиксированные значения
   const testData = [1, 2, 3, 4, 5]; // вместо random
   ```

3. **Explicit waits** - всегда явно ждите асинхронные операции
   ```typescript
   await Promise.all(tasks); // Явно ждем
   ```

4. **Адекватные timeouts** - используйте `jest.setTimeout()` для долгих тестов
   ```typescript
   jest.setTimeout(30000); // 30 секунд для performance тестов
   ```

5. **CI-friendly** - тесты должны работать в CI окружении
   - Учитывайте что CI может быть медленнее
   - Используйте переменные окружения для настройки
   ```typescript
   const isCI = process.env.CI === 'true';
   const timeout = isCI ? 10000 : 5000;
   ```

### Инструменты

Используйте helper функции из `tests/helpers/performance.ts`:

**Performance измерения:**
- `measureWithWarmup()` - измерение с warm-up прогоном
- `measureMedian()` - медианное время из нескольких запусков
- `measurePercentile()` - p95, p99 метрики
- `verifyComplexity()` - проверка временной сложности

**Асинхронные операции:**
- `waitFor()` - ждет выполнения условия с polling (вместо setTimeout)
- `withTimeout()` - добавляет timeout к Promise
- `sleep()` - async-friendly задержка

**Последнее средство:**
- `retryFlaky()` - retry wrapper (используйте только если нельзя починить по-другому)

**Примеры использования:**

```typescript
import { waitFor, withTimeout, measureMedian } from '../helpers/performance';

// Ожидание условия вместо setTimeout
it('should wait for worker to be ready', async () => {
    const thread = createThread();
    
    // Вместо: await new Promise(resolve => setTimeout(resolve, 100));
    await waitFor(() => thread.isReady, { timeout: 5000 });
    
    expect(thread.isReady).toBe(true);
});

// Защита от зависаний
it('should complete task', async () => {
    const result = await withTimeout(
        () => thread.execute(heavyTask),
        10000 // 10 секунд max
    );
    
    expect(result).toBeDefined();
});

// Performance тест
it('should be fast', () => {
    const time = measureMedian(() => {
        queue.enqueue(1);
        queue.dequeue();
    }, 5); // 5 запусков
    
    expect(time).toBeLessThan(10);
});
```

### Отладка Flaky тестов

1. **Запускайте много раз локально:**
   ```bash
   npm test -- --testNamePattern="flaky test" --maxWorkers=1 --runInBand
   # Запустите 100 раз
   for i in {1..100}; do npm test; done
   ```

2. **Изолируйте тест:**
   ```typescript
   it.only('potentially flaky test', () => {
       // ...
   });
   ```

3. **Добавьте логирование:**
   ```typescript
   console.log('State before:', getState());
   doSomething();
   console.log('State after:', getState());
   ```

4. **Используйте debugger:**
   ```typescript
   debugger; // Остановится в VS Code при запуске с debugging
   ```

### CI Pipeline настройки

В `jest.config.js`:

```javascript
module.exports = {
    testTimeout: process.env.CI ? 30000 : 10000,
    maxWorkers: process.env.CI ? 2 : '50%',
    // Retry flaky tests в CI
    jest-retries: process.env.CI ? 2 : 0,
};
```

В GitHub Actions:

```yaml
- name: Run tests
  run: npm test
  env:
    CI: true
  # Retry весь job при падении
  retry:
    max_attempts: 2
```

## Заключение

Flaky тесты - это серьезная проблема которая подрывает доверие к тестам. Следуйте этим практикам чтобы писать стабильные тесты с первого раза.

**Принцип:** Если тест падает - он должен указывать на реальный баг, а не на проблемы с самим тестом.
