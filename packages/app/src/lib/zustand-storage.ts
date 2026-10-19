import type { StateStorage } from 'zustand/middleware'

/**
 * 用 satisfies 而不是显式注解：StateStorage 允许 getItem 返回 Promise，
 * 显式注解会把 localStorage 这种同步实现也标成 `string | Promise<string | null>`，
 * 导致每个调用点都要额外收窄。
 */
export const platformStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
} satisfies StateStorage
