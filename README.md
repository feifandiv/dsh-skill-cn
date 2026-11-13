# dsh-skill-cn · 中文技能搜索

给 DSH 的 `/` 菜单加一个**中文检索源**：输入 `/与神对话` 就能搜到 `ff-yushen-duihua`。

> **定位｜克制的小功能补丁。** 只做这一件事，不改 DSH 主体：不替换内置槽位与布局、不改内核行为、不碰其他插件的数据。升级 DSH 一般无需跟着改；关掉或卸载即回到官方状态。

## 为什么需要它

DSH 的技能名被强制为 `[a-z0-9-]`（中文名在注册阶段就被丢弃），而 `/` 菜单只按**技能名**做「不区分大小写的有序子序列」匹配（`rankByName`）。所以 `/与神对话` 永远匹配不到。

本插件注册第二个 `/` 源，把每个技能的**中文名作为 `label`** 返回——`label` 是菜单契约里的第二搜索键，因此中文查询能命中；选中后插入的仍是真实的 `/ff-yushen-duihua`，和内置技能组行为一致。

中文名取自技能描述开头的 `[中文名]` 标签（桥接技能都带这个标签），所以新增技能只要保持描述以 `[中文名]` 开头就会自动被收录。

## 交互

| 输入 | 结果 |
| --- | --- |
| `/` | 只有内置技能组（本插件在查询为空时不显示，避免重复） |
| `/与神对话` | 「技能 · 中文」组出现 `与神对话 · ff-yushen-duihua`，Enter 插入 `/ff-yushen-duihua` |
| `/回忆录` | 命中同一条（描述里的关键词也参与匹配） |
| `/yushen` | 本插件不介入，走内置组（英文名搜索保持原样） |

排序：中文名完全相等 > 前缀 > 包含 > 描述包含；同分保持宿主顺序，最多 15 条。

## 结构

```
package.json      dsh.bundle.patch + dsh.client(platform: web, immediately: true)
index.js          Host 半部：空实现（能力全在浏览器）
src/match.js      纯匹配逻辑（可单测）
src/plugin.js     注册 "/" 源、拉取 skills/list、onPick 插入文本
build.mjs         把 src 拼成 client.js（window.__ModuleLoader__.load 格式）
client.js         构建产物，不要手改
test/             单测 + 浏览器 bundle 冒烟测试
```

## 开发

```bash
node build.mjs          # 改 src/*.js 后重新生成 client.js
node --test test/       # 单测 + 冒烟
```

## 安装状态

已挂进 `desktop` profile：

- 依赖：`~/.dsh/profiles/desktop/package.json` → `"@fanfan4589/dsh-skill-cn": "link:/Users/feifan/FEIFAN/08-系统/08DSH插件/dsh-skill-cn"`
- bundle：`dsh.profile.bundles` 里加了 `@fanfan4589/dsh-skill-cn`
- 挂载：`~/.dsh/profiles/desktop/node_modules/@fanfan4589/dsh-skill-cn` → 本目录
- 首次安装需重启 DSH（Host 启动时才组合插件图）；之后改 `client.js` 刷新页面即可。

## 卸载

删掉 profile 里的三处登记（`package.json` 的 dependencies/bundles、`pnpm-lock.yaml` 的 importers 条目、`node_modules/@fanfan4589/dsh-skill-cn` 符号链接），重启即可。
