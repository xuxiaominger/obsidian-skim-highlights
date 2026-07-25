# Skim Highlights → Obsidian 剪贴板卡片

Skim 高亮 → 弹窗选择 → 复制到剪贴板 → 粘贴到任意 Obsidian 笔记。

## 工作流程

1. 在 Skim 中高亮 PDF
2. Obsidian 中按 `Cmd+Alt+Shift+K`
3. 弹窗显示所有高亮（支持搜索过滤）
4. 选中一条 → 回车 → 卡片复制到剪贴板
5. 到任意笔记中 `Cmd+V` 粘贴

## 卡片格式

```markdown
> [!quote]+ 第 187 页
> One advantage of functions is the way they separate...
> 
> 📖 [p187](file:///tmp/skim_links/p187.command)
```

点击 `📖 p187` → Skim 跳到 PDF 原文位置。

## 命令

| 命令 | 快捷键 | 说明 |
|------|--------|------|
| Skim 高亮 → 选择复制 | `Cmd+Alt+Shift+K` | 弹窗选一条复制 |
| Skim 高亮 → 全部复制 | 命令面板 | 全部复制到剪贴板 |

## 安装

1. 下载 `main.js`、`manifest.json`、`versions.json`
2. 放入 `.obsidian/plugins/skim-highlights/`
3. 启用插件
4. macOS + Skim 必须

## 首次使用

点击卡片中的 `📖 pXX` 链接时，macOS 可能弹出确认框。点"打开"即可。

## 许可证

MIT
