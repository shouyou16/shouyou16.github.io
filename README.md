# shouyou16.github.io

手游16游戏盒子官方网站（纯静态 7 页 MPA，部署于 GitHub Pages）。

## 开发与测试

- **零依赖**：本项目不引入任何第三方包，无需 `npm install`。
- **环境要求**：Node.js ≥ 18（使用内置 `node:test` 测试框架）。
- **运行测试**：

  ```bash
  node --test tests/site.test.mjs
  ```

  > 注意：请使用上述**文件形式**命令。`node --test tests/` 的目录形式在部分环境下会报 `MODULE_NOT_FOUND`，不要使用。
