#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-undef */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GIST_ID = process.env.GIST_ID || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

/**
 * Парсит lcov.info и вычисляет процент покрытия
 */
function parseLcovCoverage() {
    const lcovPath = join(__dirname, "..", "coverage", "lcov.info");

    if (!existsSync(lcovPath)) {
        console.error(
            "❌ Файл coverage/lcov.info не найден. Сначала запустите: npm run test:coverage",
        );
        process.exit(1);
    }

    const lcovData = readFileSync(lcovPath, "utf-8");
    const lines = lcovData.split("\n");

    let totalFound = 0;
    let totalHit = 0;

    for (const line of lines) {
        if (line.startsWith("DA:")) {
            // DA:line_number,hit_count
            const parts = line.substring(3).split(",");
            const hitCount = parseInt(parts[1], 10);
            totalFound++;
            if (hitCount > 0) {
                totalHit++;
            }
        }
    }

    if (totalFound === 0) {
        console.error("❌ Не найдены данные о покрытии в lcov.info");
        process.exit(1);
    }

    const percentage = Math.round((totalHit / totalFound) * 100);
    return percentage;
}

/**
 * Определяет цвет бейджа на основе процента покрытия
 */
function getBadgeColor(percentage) {
    if (percentage >= 80) return "brightgreen";
    if (percentage >= 60) return "green";
    if (percentage >= 40) return "yellowgreen";
    if (percentage >= 20) return "yellow";
    return "red";
}

/**
 * Публикует данные покрытия в GitHub Gist
 */
async function publishToGist(coverage) {
    if (!GIST_ID || !GITHUB_TOKEN) {
        console.log("⚠️  GIST_ID или GITHUB_TOKEN не установлены.");
        console.log("📋 Для автоматического обновления бейджа:");
        console.log("   1. Создайте GitHub Gist с файлом coverage.json");
        console.log("   2. Установите переменные окружения:");
        console.log("      export GIST_ID=your_gist_id");
        console.log("      export GITHUB_TOKEN=your_github_token");
        return false;
    }

    const gistData = {
        description: "Code coverage badge for stardust-parallel-js",
        files: {
            "coverage.json": {
                content: JSON.stringify(
                    {
                        schemaVersion: 1,
                        label: "coverage",
                        message: `${coverage}%`,
                        color: getBadgeColor(coverage),
                    },
                    null,
                    2,
                ),
            },
        },
    };

    try {
        const response = await fetch(
            `https://api.github.com/gists/${GIST_ID}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    "User-Agent": "stardust-parallel-js",
                },
                body: JSON.stringify(gistData),
            },
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(
                `GitHub API error: ${response.status} ${response.statusText}\n${errorData}`,
            );
        }

        console.log("✅ Coverage badge обновлён в GitHub Gist!");
        console.log(`🔗 https://gist.github.com/${GIST_ID}`);
        return true;
    } catch (error) {
        console.error("❌ Ошибка при обновлении Gist:", error.message);
        console.error(
            '💡 Проверьте: 1) GIST_ID корректный, 2) GITHUB_TOKEN имеет права "gist"',
        );
        return false;
    }
}

/**
 * Обновляет бейдж в README.md (локально)
 */
function updateReadmeBadge(coverage) {
    const readmePaths = [
        join(__dirname, "..", "README.md"),
        join(__dirname, "..", "README.ru.md"),
    ];

    const color = getBadgeColor(coverage);

    for (const readmePath of readmePaths) {
        if (!existsSync(readmePath)) continue;

        let content = readFileSync(readmePath, "utf-8");

        // Ищем и заменяем бейдж покрытия
        const coverageBadgeRegex =
            /\[!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-[a-z]+\.svg\)\]/g;
        const newBadge = `[![Coverage](https://img.shields.io/badge/coverage-${coverage}%25-${color}.svg)]`;

        if (coverageBadgeRegex.test(content)) {
            content = content.replace(coverageBadgeRegex, newBadge);
            writeFileSync(readmePath, content, "utf-8");
            console.log(
                `✅ Обновлён бейдж в ${readmePath
                    .split(/[/\\]/)
                    .pop()}: ${coverage}%`,
            );
        }
    }
}

// Главная функция
async function main() {
    console.log("📊 Обновление coverage badge...\n");

    const coverage = parseLcovCoverage();
    console.log(`📈 Текущее покрытие: ${coverage}%`);
    console.log(`🎨 Цвет бейджа: ${getBadgeColor(coverage)}\n`);

    // Обновляем README локально
    updateReadmeBadge(coverage);

    // Пытаемся опубликовать в Gist
    await publishToGist(coverage);

    console.log("\n✨ Готово!");

    if (GIST_ID && GITHUB_TOKEN) {
        console.log(`🔗 Бейдж обновлён! Shields.io кэширует ~5 минут.`);
        console.log(`💡 Для сброса кэша откройте: https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/b1411/${GIST_ID}/raw/coverage.json`);
        console.log(`   (или добавьте ?${Date.now()} в конец URL для bypass кэша)`);
    }
}

main().catch(console.error);
