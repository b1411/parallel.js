# [3.0.0](https://github.com/b1411/parallel.js/compare/v2.0.0...v3.0.0) (2026-01-16)


* feat!: replace Thread class with Thread.execute() static API ([#4](https://github.com/b1411/parallel.js/issues/4)) ([9f5300e](https://github.com/b1411/parallel.js/commit/9f5300e310c4821e2b2e52148bfdaaa26dec657c))


### Bug Fixes

* increase Queue performance test timeout to handle CI variability [skip ci] ([afe4e7b](https://github.com/b1411/parallel.js/commit/afe4e7bd2d9f488dbd99c4202e9ae1c08386752f))


### BREAKING CHANGES

* Removed old Thread class constructor API. Users must
migrate from 'new Thread(fn, args)' to 'Thread.execute(fn, args)'.

- Removed Thread class constructor (src/primitives/Thread.ts)
- Removed ThreadV2 alias, now Thread is the main API
- Removed ThreadFactory, functions inlined into Thread object
- Thread is now a namespace object with static methods: execute(),
persistent(), prewarm(), clearPool()
- Updated all tests, examples, and benchmarks to use new API
- Fixed ThreadPool terminate() to reject queued tasks
- Added typecheck script to package.json

Migration guide:
Before: const thread = new Thread(() => 42); await thread.join(); After:
await Thread.execute(() => 42).join();

Co-authored-by: Rakhmat <232435084+Kemel-Army@users.noreply.github.com>

# [2.0.0](https://github.com/b1411/parallel.js/compare/v1.4.0...v2.0.0) (2026-01-16)


* feat!: implement ThreadV2 with prewarming and TTL support ([e9b5eb8](https://github.com/b1411/parallel.js/commit/e9b5eb8a6618ba743d0e9b123b20088962eb9f9d))


### Features

* add badge update step to CI after successful tests ([3b4450b](https://github.com/b1411/parallel.js/commit/3b4450b0068222a0f5aeb884c5a28db0bcf930ba))
* enhance performance testing utilities and improve test stability ([2712f2d](https://github.com/b1411/parallel.js/commit/2712f2dfeba04f699e9178c919fe4aaf00d8d9e7))


### BREAKING CHANGES

* ThreadV2 introduces a new API that replaces the legacy Thread interface. The new API provides prewarming capabilities and TTL support, which changes how threads are initialized and managed.

# [1.5.0](https://github.com/b1411/parallel.js/compare/v1.4.0...v1.5.0) (2026-01-16)


### Features

* add badge update step to CI after successful tests ([3b4450b](https://github.com/b1411/parallel.js/commit/3b4450b0068222a0f5aeb884c5a28db0bcf930ba))
* enhance performance testing utilities and improve test stability ([2712f2d](https://github.com/b1411/parallel.js/commit/2712f2dfeba04f699e9178c919fe4aaf00d8d9e7))

# [1.4.0](https://github.com/b1411/parallel.js/compare/v1.3.0...v1.4.0) (2026-01-15)


### Features

* implement Queue class with O(1) operations and comprehensive tests ([41c20c1](https://github.com/b1411/parallel.js/commit/41c20c107735fe5ce424d5dc15cc5cd8beebe80f))

# [1.3.0](https://github.com/b1411/parallel.js/compare/v1.2.0...v1.3.0) (2026-01-15)


### Features

* support async functions in Thread and ThreadPool classes with comprehensive tests ([cb01d51](https://github.com/b1411/parallel.js/commit/cb01d51a4af71eec0314e08097747da387db8d17))

# [1.2.0](https://github.com/b1411/parallel.js/compare/v1.1.0...v1.2.0) (2026-01-14)


### Features

* add Travis CI release automation ([e58f35d](https://github.com/b1411/parallel.js/commit/e58f35df4f9545be955afd98e801e43abe236b71))
* add Travis CI with semantic-release automation ([151238a](https://github.com/b1411/parallel.js/commit/151238a041ccc64451b64a090213f8d6929ad8e5))
* add Travis CI with semantic-release automation ([b675967](https://github.com/b1411/parallel.js/commit/b675967458095f2b902673d1dde1eec7c3d2afc5))
* mark support for transferable objects in roadmap as complete ([c871ee8](https://github.com/b1411/parallel.js/commit/c871ee8adeb4305f9cd7d4347c2379fdb46a0e95))

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
