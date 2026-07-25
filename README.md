# Skim Highlights → Obsidian 双链卡片

在 Skim 中高亮 PDF → 一键导入 Obsidian 生成可回溯的双链卡片。

## 功能

- 读取 Skim 当前打开 PDF 的所有高亮标注
- 按页码分组，生成可折叠 markdown 卡片
- 每条高亮附带 `skim://` 缩略链接，点击直接跳回 PDF 原文位置
- 支持热键、命令面板、状态栏、侧边栏四种触发方式

## 卡片格式

```markdown
> [!quote]+ 第 187 页 · 2026-07-25
> One advantage of functions is the way they separate blocks...
> 
> 📖 [p187](skim:///path/to/pdf?page=187)
```

- 链接文字不超过 5 个字符（如 `p187`）
- `skim://` URL 自动编码，路径含空格/括号也能正常跳转

## 安装

1. 下载 `main.js`、`manifest.json`、`versions.json`
2. 放入 vault 的 `.obsidian/plugins/skim-highlights/` 目录
3. 在 Obsidian 设置 → 第三方插件中启用 "Skim Highlights"
4. 确保 Skim.app 已安装（macOS 独占）

## 使用

| 方式 | 操作 |
|------|------|
| 快捷键 | `Cmd+Alt+Shift+K` |
| 命令面板 | `Cmd+P` → 输入 "Import Skim" |
| 状态栏 | 点击底部状态栏 "Skim" |
| 侧边栏 | 点击左侧丝带高亮笔图标 |

## 依赖

- macOS + Skim.app
- Obsidian ≥ 0.15.0
- 系统需授予自动化权限（首次使用时 macOS 会提示）

## 许可证

MIT
