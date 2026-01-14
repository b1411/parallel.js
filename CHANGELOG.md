# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-14

### Added
- **Automatic Transferables Extraction**: Implemented `extractTransferables()` utility that automatically detects and extracts transferable objects (ArrayBuffer, TypedArrays, MessagePort, etc.) from function arguments
- **Thread Class**: Simple API for running single tasks in worker threads with automatic transferables handling
- **ThreadPool Class**: Efficient worker pool management with task queueing and automatic load balancing
  - Configurable pool size
  - Automatic worker recovery on crashes
  - Built-in stats tracking (available/busy workers, queued tasks)
  - `execute()` method for single task execution
  - `map()` method for parallel array processing
- **Comprehensive Test Suite**:
  - Basic Thread and ThreadPool functionality tests
  - Transferables handling tests (ArrayBuffer, TypedArrays)
  - Heavy transferables tests (~100MB data)
  - Total: 39 passing tests
- **Performance Benchmarks**:
  - CPU-intensive operations benchmark
  - Data processing benchmark
  - Transferables performance comparison (with/without zero-copy transfer)
  - Memory pressure tests with large datasets
- **ESLint Configuration**: Strict TypeScript linting with relaxed rules for tests and benchmarks
- **Jest Configuration**: Full test coverage setup with lcov reporting
- **Examples**:
  - Basic Thread usage
  - ThreadPool usage
  - Fastify integration for task management API
  - Arrow functions support

### Performance
- **Zero-copy Transfer**: Transferables provide ~1.26x speedup (20.4% faster) compared to serialization
- **High Throughput**: Up to 120 GB/s processing speed for large buffers in ThreadPool
- **Scalability**: Linear performance improvement with concurrent threads (up to 16 threads tested)
- **Memory Efficiency**: Handles 2GB+ datasets efficiently through transferable objects

### Technical Details
- TypeScript-first implementation with full type safety
- Path aliases support (`@/` for `src/`)
- Worker thread isolation with proper error handling
- Automatic cleanup and resource management
- Queue-based task distribution in ThreadPool

[Unreleased]: https://github.com/b1411/parallel.js/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/b1411/parallel.js/compare/v1.0.10...v1.1.0
