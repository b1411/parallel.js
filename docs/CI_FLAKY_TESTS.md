# CI/CD Strategies for Flaky Tests

## Проблема с Flaky тестами в CI

Flaky тесты особенно опасны в CI/CD pipeline:
- ❌ Блокируют деплои когда на самом деле нет багов
- ❌ Разработчики теряют доверие к тестам
- ❌ Тратится время на перезапуски pipeline
- ❌ Сложно отличить настоящие баги от ложных срабатываний

## Стратегии борьбы

### 1. Предотвращение на этапе разработки

**Используйте helper функции:**
```typescript
import { waitFor, withTimeout, measureMedian } from '../helpers/performance';

// Вместо setTimeout - используйте waitFor
await waitFor(() => condition, { timeout: 5000 });

// Вместо проверки среднего времени - проверяйте total
expect(totalTime).toBeLessThan(100);
```

**Запускайте тесты локально много раз:**
```bash
# Linux/Mac
for i in {1..50}; do npm test || break; done

# PowerShell
1..50 | ForEach-Object { npm test; if ($LASTEXITCODE -ne 0) { break } }
```

### 2. Настройка Jest для CI

**jest.config.mjs:**
```javascript
export default {
    // Увеличиваем timeout в CI
    testTimeout: process.env.CI ? 30000 : 10000,
    
    // Ограничиваем параллелизм в CI (избегаем race conditions)
    maxWorkers: process.env.CI ? 2 : '50%',
    
    // Запускаем тесты последовательно если нужно
    runInBand: process.env.CI === 'true',
    
    // Выводим больше информации в CI
    verbose: process.env.CI === 'true',
};
```

### 3. GitHub Actions Retry Strategy

**Пример .github/workflows/test.yml:**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      # Не останавливаем другие варианты при падении одного
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Вариант 1: Retry на уровне step
      - name: Run tests (with retry)
        uses: nick-fields/retry-action@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          retry_wait_seconds: 30
          command: npm test
        env:
          CI: true
      
      # Вариант 2: Собственный retry скрипт
      - name: Run tests (custom retry)
        run: |
          for i in {1..3}; do
            npm test && break
            echo "Attempt $i failed, retrying..."
            sleep 30
          done
        env:
          CI: true
      
      - name: Upload coverage
        if: success()
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

**С отдельными job'ами для flaky тестов:**

```yaml
jobs:
  stable-tests:
    name: Stable Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      # Запускаем только стабильные тесты
      - run: npm test -- --testPathIgnorePatterns=flaky
  
  flaky-tests:
    name: Performance Tests (allowed to fail)
    runs-on: ubuntu-latest
    # Не блокируем merge при падении
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      # Запускаем только performance тесты
      - run: npm test -- --testPathPattern=Performance
        env:
          CI: true
```

### 4. Категоризация тестов

**Создайте отдельные test suites:**

```typescript
// tests/stable/core.test.ts
describe('Core functionality', () => {
    // Стабильные тесты
});

// tests/performance/benchmarks.test.ts  
describe('Performance benchmarks', () => {
    // Performance тесты (могут быть flaky)
});

// tests/integration/external.test.ts
describe('External API integration', () => {
    // Интеграционные тесты (зависят от внешних сервисов)
});
```

**package.json scripts:**

```json
{
    "scripts": {
        "test": "jest",
        "test:stable": "jest tests/stable",
        "test:performance": "jest tests/performance",
        "test:integration": "jest tests/integration",
        "test:ci": "jest --maxWorkers=2 --runInBand"
    }
}
```

**В CI запускайте разные наборы:**

```yaml
- name: Core tests (required)
  run: npm run test:stable

- name: Performance tests (informational)
  run: npm run test:performance
  continue-on-error: true

- name: Integration tests (with retry)
  uses: nick-fields/retry-action@v2
  with:
    max_attempts: 3
    command: npm run test:integration
```

### 5. Мониторинг flaky тестов

**Добавьте Jest reporter для отслеживания:**

```javascript
// custom-reporter.js
export default class FlakyTestReporter {
    onTestResult(test, testResult) {
        testResult.testResults.forEach(result => {
            if (result.status === 'failed') {
                // Логируем информацию о падении
                console.log(`FLAKY_TEST: ${result.fullName}`);
                console.log(`Duration: ${result.duration}ms`);
                console.log(`Failure: ${result.failureMessages[0]}`);
            }
        });
    }
}
```

**В jest.config.mjs:**

```javascript
export default {
    reporters: [
        'default',
        './custom-reporter.js'
    ],
};
```

### 6. Automatic Quarantine

**Автоматически помечайте flaky тесты:**

```typescript
// tests/helpers/quarantine.ts
const flakyTests = new Set([
    'should handle edge case X', // Known flaky
]);

export function quarantine(testName: string, fn: () => void | Promise<void>) {
    if (process.env.CI && flakyTests.has(testName)) {
        it.skip(`[QUARANTINED] ${testName}`, fn);
    } else {
        it(testName, fn);
    }
}
```

**Использование:**

```typescript
import { quarantine } from '../helpers/quarantine';

describe('My tests', () => {
    quarantine('should handle edge case X', async () => {
        // Этот тест будет пропущен в CI
    });
});
```

### 7. Test Stability Score

**Отслеживайте стабильность тестов:**

```bash
# Запустите тесты 100 раз и посчитайте % успеха
npm test -- --testNamePattern="specific test" --maxWorkers=1 > test-results.txt 2>&1
grep -c "PASS" test-results.txt
```

**Создайте скрипт для анализа:**

```javascript
// scripts/test-stability.mjs
import { spawn } from 'child_process';

async function runTest(name, iterations = 50) {
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < iterations; i++) {
        const result = await new Promise((resolve) => {
            const proc = spawn('npm', ['test', '--', '--testNamePattern', name]);
            proc.on('exit', (code) => resolve(code === 0));
        });
        
        result ? passed++ : failed++;
    }
    
    const stability = (passed / iterations * 100).toFixed(2);
    console.log(`Test: ${name}`);
    console.log(`Stability: ${stability}% (${passed}/${iterations})`);
    
    return stability >= 95; // Требуем минимум 95% стабильности
}

// Использование
await runTest('should process queue correctly', 50);
```

### 8. Environment Variables для debugging

**В тестах:**

```typescript
if (process.env.DEBUG_TESTS === 'true') {
    console.log('Thread state:', thread.getState());
    console.log('Queue size:', queue.size());
}

// Более агрессивные timeouts для debugging
const timeout = process.env.DEBUG_TESTS ? 60000 : 5000;
await waitFor(condition, { timeout });
```

**В CI:**

```yaml
- name: Run tests with debugging
  if: failure() # Только при падении
  run: npm test
  env:
    DEBUG_TESTS: true
    CI: true
```

## Рекомендации

### ✅ DO:

1. **Пишите детерминированные тесты** - один и тот же input всегда дает один и тот же output
2. **Используйте waitFor вместо setTimeout** - ждите условия, а не фиксированное время
3. **Проверяйте total time вместо average time** - более стабильно
4. **Запускайте тесты много раз локально** - проверьте стабильность до commit
5. **Категоризируйте тесты** - отделяйте stable от potentially flaky
6. **Используйте retry в CI** - но только для известных flaky тестов
7. **Мониторьте flaky тесты** - отслеживайте какие тесты часто падают

### ❌ DON'T:

1. **Не используйте random данные** - используйте seed или фиксированные значения
2. **Не полагайтесь на setTimeout** - используйте explicit waits
3. **Не игнорируйте flaky тесты** - исправляйте их
4. **Не добавляйте retry ко всем тестам** - только к действительно необходимым
5. **Не увеличивайте timeouts бесконечно** - найдите корень проблемы
6. **Не смешивайте unit и integration тесты** - разделяйте их
7. **Не запускайте performance тесты параллельно** - они влияют друг на друга

## Метрики для отслеживания

В dashboard CI/CD отслеживайте:

- **Test Stability Rate** - % тестов которые проходят стабильно
- **Flaky Test Count** - количество нестабильных тестов
- **Retry Rate** - как часто приходится перезапускать
- **Average Test Duration** - среднее время выполнения тестов
- **CI Pipeline Success Rate** - % успешных прогонов

## Заключение

Борьба с flaky тестами - это ongoing процесс. Используйте эти стратегии чтобы:

1. Предотвращать flaky тесты на этапе разработки
2. Быстро обнаруживать и изолировать их
3. Не блокировать production из-за false positives
4. Постепенно улучшать стабильность тестов

**Помните:** Цель - не спрятать проблему, а решить её. Flaky тесты должны быть редким исключением, а не нормой.
