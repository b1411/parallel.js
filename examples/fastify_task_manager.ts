// Example file - requires 'fastify' to be installed separately
// Install with: npm install fastify --save-dev
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - fastify is an optional dev dependency for examples only
import Fastify from "fastify";
import { Thread } from "../src/index";

const fastify = Fastify({ logger: true });

interface TaskResult {
    promise: Promise<number>;
    result?: number;
    completed: boolean;
}

// Хранилище задач
const threads = new Map<string, TaskResult>();

// Генерация ID задачи
function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Запуск долгой задачи
fastify.post<{
    Body: { value: number }
}>("/start-thread", async (request, reply) => {
    const { value } = request.body;
    const taskId = generateTaskId();

    const promise = Thread.execute((n: number) => {
        // Имитация долгой задачи
        let result = 0;
        for (let i = 0; i < n * 1e7; i++) {
            result += Math.sqrt(i);
        }
        return result;
    }, [value]).join();

    threads.set(taskId, {
        promise,
        completed: false
    });

    // Обрабатываем результат асинхронно
    promise.then((result: number) => {
        const task = threads.get(taskId);
        if (task) {
            task.result = result;
            task.completed = true;
        }
    }).catch((error: Error) => {
        console.error(`Task ${taskId} failed:`, error);
        threads.delete(taskId);
    });

    reply.send({
        taskId,
        message: "Thread started",
        status: "running"
    });
});

// Проверка статуса задачи
fastify.get<{
    Params: { taskId: string }
}>("/thread-status/:taskId", async (request, reply) => {
    const { taskId } = request.params;
    const task = threads.get(taskId);

    if (!task) {
        reply.code(404).send({ error: "Task not found" });
        return;
    }

    if (task.completed) {
        reply.send({
            taskId,
            status: "completed",
            result: task.result
        });
        // Можно удалить после получения результата
        // threads.delete(taskId);
    } else {
        reply.send({
            taskId,
            status: "running"
        });
    }
});

// Получить результат (ждет завершения)
fastify.get<{
    Params: { taskId: string }
}>("/thread-result/:taskId", async (request, reply) => {
    const { taskId } = request.params;
    const task = threads.get(taskId);

    if (!task) {
        reply.code(404).send({ error: "Task not found" });
        return;
    }

    try {
        // Ждем завершения если еще не завершено
        const result = await task.promise;

        reply.send({
            taskId,
            status: "completed",
            result
        });

        // Удаляем задачу после получения результата
        threads.delete(taskId);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reply.code(500).send({
            error: "Task execution failed",
            message: errorMessage
        });
        threads.delete(taskId);
    }
});

// Список всех задач
fastify.get("/threads", async (request, reply) => {
    const tasks = Array.from(threads.entries()).map(([id, task]) => ({
        taskId: id,
        status: task.completed ? 'completed' : 'running',
        hasResult: task.completed
    }));

    reply.send({ tasks });
});

// Отменить/удалить задачу
fastify.delete<{
    Params: { taskId: string }
}>("/thread/:taskId", async (request, reply) => {
    const { taskId } = request.params;

    if (!threads.has(taskId)) {
        reply.code(404).send({ error: "Task not found" });
        return;
    }

    threads.delete(taskId);

    reply.send({
        message: "Task deleted",
        taskId
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await fastify.close();
    threads.clear();
    process.exit(0);
});

const startServer = async () => {
    try {
        await fastify.listen({ port: 3000 });
        console.log("Server is running on http://localhost:3000");
        console.log("\nEndpoints:");
        console.log("  POST   /start-thread        - Start a new thread");
        console.log("  GET    /thread-status/:id   - Check thread status");
        console.log("  GET    /thread-result/:id   - Get result (waits if needed)");
        console.log("  GET    /threads             - List all threads");
        console.log("  DELETE /thread/:id          - Cancel/delete thread");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

startServer();