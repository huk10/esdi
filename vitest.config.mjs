/// <reference types="vitest" />
import { defineConfig } from "vite";
import typescript from '@rollup/plugin-typescript';

export default defineConfig( {
  test: {
    globals: true,
    setupFiles: ["./setup.ts"],
    coverage: {
      enabled: false,
      provider: 'v8', // 'istanbul' or 'v8'
      reporter: [ "text", "json-summary", "html" ],
      include: ["src/**"],
    },
  },
  // esbuild 和 swc 目前都没有完成对第三阶段的装饰器提案的支持。
  // 只能使用 babel 或 TypeScript 来编译。
  esbuild: false,
  plugins: [typescript({tsconfig: './config/tsconfig.test.json'})]
} );
