#!/usr/bin/env node

/**
 * Скрипт для ручного создания релиза
 * Использование: node scripts/manual-release.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const currentVersion = JSON.parse(readFileSync('./package.json', 'utf8')).version;

console.log(`📦 Текущая версия: ${currentVersion}`);

// Проверяем статус git
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status) {
    console.error('❌ У вас есть незакоммиченные изменения!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Ошибка проверки git статуса:', error.message);
  process.exit(1);
}

// Запускаем тесты
console.log('\n🧪 Запуск тестов...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ Тесты пройдены');
} catch (error) {
  console.error('❌ Тесты провалились!');
  process.exit(1);
}

// Собираем проект
console.log('\n🔨 Сборка проекта...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Проект собран');
} catch (error) {
  console.error('❌ Ошибка сборки!');
  process.exit(1);
}

console.log('\n✅ Все проверки пройдены!');
console.log('\n📝 Следующие шаги:');
console.log('1. Создайте PR из develop в main');
console.log('2. После мерджа Travis автоматически создаст релиз');
console.log('3. Или используйте: npm version [patch|minor|major]');
