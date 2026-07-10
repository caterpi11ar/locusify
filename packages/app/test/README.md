# Test

本目录包含项目的测试文件
使用 [Vitest](https://vitest.dev/) 作为测试框架。

## 运行测试

### 运行所有测试
```bash
pnpm test
```

### 运行特定测试文件
```bash
pnpm test test/stores/replayStore.test.ts
```

### 以监视模式运行测试
```bash
pnpm test -- --watch
```

### 运行测试并生成覆盖率报告
```bash
pnpm test -- --coverage
```

## 编写测试

测试文件应以 `.test.ts` 或 `.spec.ts` 扩展名命名。将测试文件放在与源代码结构相匹配的适当目录中。

测试结构示例:
```typescript
import { describe, expect, it } from 'vitest'
import { haversineDistance } from '../../src/lib/geo'

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistance([0, 0], [0, 0])).toBe(0)
  })
})
```

## 测试设置

全局测试配置在 `setup.ts` 中。这包括 Chai 断言库的配置等设置。

## 实用命令

### 在 UI 模式下运行测试
```bash
pnpm test -- --ui
```

### 运行特定模式的测试
```bash
pnpm test -- -t "测试模式"
```

### 按名称模式过滤测试
```bash
pnpm test -- --testNamePattern="replay"
```

### 使用特定配置运行测试
```bash
pnpm test -- --config ./custom-vitest.config.ts
```
