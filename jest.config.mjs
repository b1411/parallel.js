import { createDefaultEsmPreset } from "ts-jest";
import process from "node:process";

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import("jest").Config} **/
export default {
    ...defaultEsmPreset,
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^@/(.*)\\.js$": "<rootDir>/src/$1",
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    // Skip flaky tests in CI (Travis)
    testPathIgnorePatterns: process.env.CI
        ? ["/node_modules/", "HeavyTransferables.test.ts", "Queue.test.ts"]
        : ["/node_modules/"],
    collectCoverage: false,
    collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 75,
            statements: 75,
        },
    },
};
