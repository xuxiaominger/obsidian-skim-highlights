# Skim Highlights → Obsidian 双链卡片

Skim 高亮 → 一键导入 Obsidian，生成可点击跳回 PDF 原文的卡片。

## 工作原理

1. 插件读取 Skim 当前 PDF 的所有高亮标注
2. 为每页生成 `.command` 跳转脚本（存入 `/tmp/skim_links/`）
3. 卡片中的 `📖 [p187]` 是 `file://` 链接，点击即跳回原文精确位置

## 卡片格式

```markdown
> [!quote]+ 第 187 页 · 2026-07-25
> One advantage of functions is the way they separate...
> 
> 📖 [p187](file:///tmp/skim_links/p187.command)
```

## 安装

1. 下载 `main.js`、`manifest.json`、`versions.json`
2. 放入 `.obsidian/plugins/skim-highlights/`
3. 启用插件
4. macOS + Skim 必须

## 使用

| 方式 | 操作 |
|------|------|
| 快捷键 | `Cmd+Alt+Shift+K` |
| 命令面板 | `Cmd+P` → "Import Skim" |
| 状态栏 | 底部 "Skim" |
| 侧边栏 | 高亮笔图标 |

## 首次使用

点击卡片链接时，macOS 可能弹出确认框 —— 这是因为 `.command` 文件需要执行权限。点"打开"即可，Skim 自动跳转到对应页面。

## 许可证

MIT
