/// <reference types="vitest" />
import { defineConfig } from "vite";
import swc from '@rollup/plugin-swc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig( {
  test: {
    setupFiles:['./config/test-setup.ts'],
    coverage: {
      enabled: false,
      reporter: [ "text", "json", "html" ],
      include: ["src/**"],
    },
  },
  // esbuild 不支持 emitDecoratorMetadata 需要使用 swc 来编译 ts 文件
  esbuild: false,
  plugins: [
    swc( {
      swc: {
        jsc: {
          parser: {
            syntax: "typescript",
            dynamicImport: true,
            decorators: true,
          },
          baseUrl: __dirname,
          target: "es2021",
          paths: {
            "@lib": ["../src/index.mts"],
          },
          transform: {
            decoratorMetadata: true,
          },
        },
      },
    } ),
  ],
} );
