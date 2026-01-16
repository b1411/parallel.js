/**
 * Helper functions for stable performance testing
 */

/**
 * Измеряет время выполнения функции с warm-up прогоном
 * @param fn - Функция для измерения
 * @param warmupRuns - Количество прогревочных запусков (default: 1)
 * @returns Время выполнения в миллисекундах
 */
export function measureWithWarmup(fn: () => void, warmupRuns = 1): number {
    // Warm up - избегаем JIT compilation overhead
    for (let i = 0; i < warmupRuns; i++) {
        fn();
    }
    
    // Actual measurement
    const start = performance.now();
    fn();
    const end = performance.now();
    
    return end - start;
}

/**
 * Измеряет медианное время из нескольких запусков
 * Более стабильно чем среднее, т.к. игнорирует выбросы
 * @param fn - Функция для измерения
 * @param runs - Количество запусков (default: 3)
 * @returns Медианное время выполнения в миллисекундах
 */
export function measureMedian(fn: () => void, runs = 3): number {
    const times: number[] = [];
    
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        fn();
        const end = performance.now();
        times.push(end - start);
    }
    
    times.sort((a, b) => a - b);
    return times[Math.floor(runs / 2)];
}

/**
 * Измеряет перцентиль времени выполнения (например, p95)
 * @param fn - Функция для измерения
 * @param runs - Количество запусков
 * @param percentile - Перцентиль (0-100)
 * @returns Время выполнения на указанном перцентиле
 */
export function measurePercentile(
    fn: () => void,
    runs = 10,
    percentile = 95
): number {
    const times: number[] = [];
    
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        fn();
        const end = performance.now();
        times.push(end - start);
    }
    
    times.sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * runs);
    return times[Math.min(index, runs - 1)];
}

/**
 * Проверяет что операция выполняется за O(1) или O(log n) время
 * Запускает функцию с разными размерами входных данных и проверяет рост времени
 * @param createTest - Функция которая создает тест для заданного размера
 * @param sizes - Массив размеров для тестирования
 * @param maxGrowthRatio - Максимально допустимое отношение времени (default: 10)
 */
export function verifyComplexity(
    createTest: (size: number) => () => void,
    sizes: number[] = [1000, 10000, 50000],
    maxGrowthRatio = 10
): void {
    const times: number[] = [];
    
    for (const size of sizes) {
        const testFn = createTest(size);
        const time = measureMedian(testFn, 3);
        times.push(time / size); // Нормализуем по размеру
    }
    
    const ratio = Math.max(...times) / Math.min(...times);
    
    if (ratio >= maxGrowthRatio) {
        throw new Error(
            `Complexity check failed: time ratio ${ratio.toFixed(2)} exceeds limit ${maxGrowthRatio}`
        );
    }
}

/**
 * Retry wrapper для flaky тестов
 * @param fn - Тест функция
 * @param maxRetries - Максимальное количество попыток
 * @param delayMs - Задержка между попытками
 */
export async function retryFlaky<T>(
    fn: () => T | Promise<T>,
    maxRetries = 3,
    delayMs = 100
): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    throw lastError;
}

/**
 * Ожидает выполнения условия с polling
 * Более надежная альтернатива setTimeout для тестов
 * @param condition - Функция которая проверяет условие
 * @param options - Опции ожидания
 * @returns Promise который резолвится когда условие выполнено
 * @throws Error если timeout истек
 * 
 * @example
 * await waitFor(() => thread.isReady, { timeout: 5000 });
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
        timeout?: number;
        interval?: number;
        message?: string;
    } = {}
): Promise<void> {
    const {
        timeout = 5000,
        interval = 50,
        message = 'Condition not met within timeout'
    } = options;
    
    const startTime = Date.now();
    
    while (true) {
        const result = await condition();
        
        if (result) {
            return;
        }
        
        if (Date.now() - startTime > timeout) {
            throw new Error(`${message} (timeout: ${timeout}ms)`);
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

/**
 * Ожидает выполнения асинхронной операции с разумным timeout
 * Более безопасная альтернатива простому setTimeout
 * @param fn - Асинхронная функция
 * @param timeoutMs - Timeout в миллисекундах
 * @returns Promise с результатом или ошибкой timeout
 * 
 * @example
 * const result = await withTimeout(() => thread.execute(fn), 5000);
 */
export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs = 5000
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

/**
 * Задержка с Promise (альтернатива setTimeout для async/await)
 * @param ms - Время задержки в миллисекундах
 * 
 * @example
 * await sleep(100);
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
