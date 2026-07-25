# Skim Highlights → Obsidian 剪贴板卡片

**Skim 中高亮 → 自动复制到剪贴板 → 粘贴到任意 Obsidian 笔记。零操作。**

## 工作方式

插件在 Obsidian 内轮询 Skim，每 1.5 秒检测新高亮。一旦你在 Skim 中划了高亮：

1. 卡片自动进入剪贴板
2. 到 Obsidian 任意笔记 `Cmd+V` 粘贴
3. 点击卡片中的 `📖 pXX` 链接 → Skim 跳回原文位置

## 卡片格式

```markdown
> [!quote]+ 第 187 页
> One advantage of functions is the way they separate...
> 
> 📖 [p187](file:///tmp/skim_links/p187.command)
```

## 安装

1. 下载 `main.js`、`manifest.json`、`versions.json`
2. 放入 `.obsidian/plugins/skim-highlights/`
3. 启用插件 — 状态栏出现 🟢 Skim监听
4. macOS + Skim 必须

## 控制

| 方式 | 操作 |
|------|------|
| 状态栏 | 🟢 运行中 / ⚫ 已停止 |
| 侧边栏 | 高亮笔图标点击启停 |
| 命令面板 | `Skim 高亮监听: 启停` |

## 首次使用

首次点击 `📖 pXX` 链接时 macOS 可能弹确认框，点"打开"即可。

## 许可证

MIT
