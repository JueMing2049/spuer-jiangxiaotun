# SPUer-江小猪

已接入 [HNP](https://github.com/JueMing2049/html-native-plugin) 零依赖 HTML 原生交互层，生成版本 `v0.3.0`。

模板：**图显前置工作台**（`diagram-first`）。入口 `index.html`。


## 已落地的文件

```
src/hnp.js          运行时（上游 · 勿改）
src/hnp.css         设计 token 与组件样式（上游 · 勿改）
src/hnp-theme.css   你的样式层（随便改，升级不覆盖）
plugins/            3 个插件（上游 · 勿改）
.hnp-lock.json      来源记录（版本、上游 commit、每文件哈希）
```

改配色、间距、字体请写 `src/hnp-theme.css`。改了上游文件也能跑，但升级时会被识别为"你改过"，跳过并提示。

## 已启用的插件

| `data-hnp` | 作用 | 挂在哪 |
| --- | --- | --- |
| `tabs` | 标签页，支持方向键 | .hnp-tabs 容器 |
| `timeline` | 时间轴逐项点亮 | .hnp-tl 容器 |
| `anno` | 就地批注，导出台账 JSON | body |

## 接进自己的页面

在页面头部引样式，在 `</body>` 前引运行时与插件，顺序不能反（插件靠 `HNP.define` 注册，运行时必须先到）：

```html
<link rel="stylesheet" href="src/hnp.css" />
<link rel="stylesheet" href="src/hnp-theme.css" />
...
<script src="src/hnp.js"></script>
<script src="plugins/tabs.js"></script>
<script src="plugins/timeline.js"></script>
<script src="plugins/anno.js"></script>
```

`src/hnp.css` 是上游文件，升级会整份替换，**别改**。要改配色、间距、字体，写进 `src/hnp-theme.css`，那是你的地盘，升级永远不碰。

然后在需要交互的容器上写 `data-hnp`，一个容器可以挂多个，用空格分隔：

```html
<div data-hnp="tabs timeline">…</div>
```

运行时会在 `DOMContentLoaded` 时自动挂载一次，无需手写调用。

## 几条容易踩的线

- **批注需要 `data-block`**：`anno` 只认带 `data-block` 的容器，块内文本才能被选中批注。
- **筛选要有作用域**：把 `filter` 的容器和条目一起放进 `data-hnp-scope`，多份筛选才不会互相清空。
- **中间不要插队**：`hnp.js` 必须排在所有 `plugins/*.js` 之前。
- **单文件分发**：需要离线或邮件发送时，用 `--single` 生成全内联的 `demo/single.html`。

## 卸载与重挂

```js
HNP.unmount(document, 'tabs');   // 卸载并按登记清理所有监听器
HNP.use('tabs').mount(document); // 重新挂载
HNP.inspect();                   // 查看当前各插件实例数
```

## 以后升级

上游发了新版，不必重新生成（那会冲掉你的改动）。用升级命令，它靠 `.hnp-lock.json` 判断哪些文件你没动过：

```bash
# 先看会动哪些文件（默认只预览，不写盘）
node <skill>/scripts/upgrade.mjs --dir .

# 确认后执行
node <skill>/scripts/upgrade.mjs --dir . --apply
```

你没动过的上游文件会被替换；你动过的会列出来并跳过；`src/hnp-theme.css` 永远不在升级范围内。

## 看效果

打开 `index.html`：先定级、再对标、再画图，五图确认后誊字段，最后导出 `diagram-first.json` 与 `app-spec.md`。
