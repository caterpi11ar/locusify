import { chai } from 'vitest'

// Polyfill requestAnimationFrame / cancelAnimationFrame for Node
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)
}

/**
 * 配置 Chai 断言库的截断阈值
 * 当测试断言失败时，Chai 会显示预期值和实际值的差异
 * 默认情况下，Chai 会在对象或数组太大时截断显示内容
 * 将阈值设置为较大的值（10000）可以在测试失败时显示更完整的错误信息
 * 这有助于更好地调试复杂对象比较失败的原因
 */
chai.config.truncateThreshold = 10000
