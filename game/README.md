# 三国沙盘 · 战略原型（Phaser 3 横屏 H5 Demo）

> 学习/原型用途的横屏 SLG 核心玩法 Demo，基于对《三国志·战略版》v2085.1788 的 **rea 逆向取证 + 18 张商店截图视觉规格** 实现。
> **不含任何原版立绘、Logo、字体、宣传文案与 elp 资源**，全部视觉由 Phaser Graphics 程序化绘制。

## 1. 运行

```bash
# 方式一：直接双击 index.html（传统 script 标签，file:// 可用）
# 方式二：起本地静态服务器（推荐，便于真机/浏览器验收）
cd /workspace/三国志战略版/game
python3 -m http.server 8088
# 浏览器打开 http://localhost:8088/
```

Phaser 3.90.0 已放在 `vendor/phaser.min.js`，**无需联网、无需 npm install**。

## 2. 玩法与操作

| 步骤 | 操作 |
|---|---|
| 1 | 标题页点 [开始新赛季]（有存档时可 [继续赛季]） |
| 2 | 点击沙盘上与己方领地**相邻**的地块，右侧栏显示详情 |
| 3 | 点 [出征]（消耗 15 体力）→ 橙色箭头 + 部队移动动画 |
| 4 | 中立空地直接占领（领地 +1、资源产量 +）；有守军则进入**战斗结算**界面 |
| 5 | 战斗胜利点 [占领该地]，失败点 [撤退] |
| 6 | 底栏 [内政] 征兵 / 委任，[武将] 装配战法与编成队伍，[赛季目标] 看进度 |
| 7 | 占领 ≥30 块地 或 攻占 3 座州城 → 霸业达成 |

- 每 **5 秒** 结算一次四资源与体力（体力 +1）；进度自动存 `localStorage`（键 `sg_sandbox_save_v1`）。
- **ESC** 关闭面板；底栏 [音乐] 开关轻量 BGM；[重开赛季] 清空存档。
- 控制台可用 `SG.State.debug.*` 构造验收前置条件（见第 5 节）。

## 3. 文件结构

```
game/
├── index.html                  横屏 viewport + 旋转提示 + 脚本加载顺序
├── vendor/phaser.min.js        Phaser 3.90.0（本地）
├── src/
│   ├── theme.js                配色/字号/间距常量（与资源分析报告 6.5 一一对应）
│   ├── data.js                 州域/地形/武将/战法/兵种克制静态配置
│   ├── audio.js                WebAudio 合成音效（触发点对应 6.3）
│   ├── battle.js               BattleService：战力公式、克制/战法系数、战损
│   ├── state.js                单一状态源 + 存档 + 资源 tick + 出征/占领/征兵/编成
│   ├── ui/
│   │   ├── widgets.js          Button / Panel / Toast / PanelManager（公共组件）
│   │   ├── Hud.js              顶部 HUD（君主/货币/四资源）
│   │   ├── CityPanel.js        用例2 城池内政（资源/征兵/委任）
│   │   └── HeroPanel.js        用例3 武将战法（四分类卡/队伍编成）
│   ├── scenes/
│   │   ├── BootScene.js        启动引导
│   │   ├── TitleScene.js       标题页
│   │   ├── MapScene.js         用例1 沙盘主界面（核心）
│   │   └── BattleScene.js      用例4 战斗结算
│   └── main.js                 Phaser.Game 配置（FIT + 横屏检测）
└── README.md
```

## 4. 与文档 / 技能的对应

| 依据 | 落地 |
|---|---|
| `01_REA逆向与游戏资源分析.md` §6.5 | `theme.js` 全量常量，`C.*` 数字色 / `S.*` 字符串色 |
| §6.3 音效触发点 | `audio.js` 的 `click/march/arrive/occupy/battle/recruit/warn/victory` |
| §5.1 HUD 规格 | `Hud.js` 字段与「产量/当前/上限」格式 |
| `02_需求规格_01_沙盘主界面.md` | `MapScene.js`（96 格、州旗、行军箭头、选中详情、底栏） |
| `02_需求规格_02_城池内政界面.md` | `CityPanel.js`（计数器复用表单模版 4） |
| `02_需求规格_03_武将战法界面.md` | `HeroPanel.js`（武将卡复用 Card 模版 3） |
| `02_需求规格_04_战斗结算界面.md` | `BattleScene.js`（对垒卡复用 Card 模版 4） |
| mini-game-builder 铁律 1 | 横屏 1280×720 + `Scale.FIT` + 移动端竖屏旋转遮罩 |
| mini-game-builder 铁律 2/3 | Phaser 3 引擎 + Boot/Title/Map/Battle 多 Scene |
| mini-game-builder 铁律 5 | 先产出《游戏资源分析》再写码，配色/字号/间距/音效逐项对齐 |
| mini-game-builder 铁律 6 | JSDoc 注释、方法职责单一、错误处理不吞异常（输出到 console） |

### 规范遵循与偏离（如实说明）

| 铁律 | 状态 | 说明 |
|---|---|---|
| 横屏 / Phaser 3 / 资源分析 / 编码规范 | ✅ 遵守 | 见上表 |
| cherry Go 联机后端 | ⚠️ 未启用 | 本次为**单机可玩 Demo**，无联机/排行榜需求；已预留 `SaveService.save()` / `BattleService.resolve()` 边界，接入时替换 `state.js` 的持久化与结算调用即可 |
| prjtmpl 模板工程 | ⚠️ 未启用 | 为便于浏览器直接预览，采用纯静态 H5 工程；分层（data/state/service/ui/scenes）与模板基建（请求封装/路由）的对应关系见第 3 节 |
| 上传 GitHub 仓库 | ⚠️ 未执行 | 按用户选择「本地交付到 /workspace，不自动上传 GitHub / 部署服务器」 |
| 线框图横屏 | ⚠️ 有依据偏离 | rea 取证 `cn.gosdk.screenType = L`；已在《总览》第 4 节备案 |

## 5. 验收调试接口

浏览器控制台可直接调用，用于走查需求文档「验收标准」的边界用例：

```js
SG.State.debug.setStamina(10)          // TC-06 体力不足
SG.State.debug.setRes('grain', 0)      // TC-03 资源不足
SG.State.debug.setSoldiers(0)          // 兵力为 0
SG.State.debug.setTacticPoints(500)    // TC-03 战法点不足
SG.State.debug.captureRandom(29)       // TC-13 领地逼近赛季目标
SG.State.newGame()                     // 重开（清空当前状态）
SG.State.data                          // 查看完整状态
```

## 6. 兼容性

- Chrome / Chromium / Edge（桌面与移动横屏）；桌面竖窗口按 FIT 缩放保持可见，触摸设备竖屏显示旋转遮罩。
- 若浏览器禁用 `localStorage`，游戏仍可运行，仅提示进度不保存。

## 7. 交付前验收（Playwright / Chromium）

结构化结果见 `../验收结果.json`，视觉证据见 `../验收截图/`（11 张 PNG）。

| 验收项 | 结果 |
|---|---|
| 全部 `src/**/*.js` 语法检查 | 通过 |
| 标题页 → 进入地图（96 格六边形） | 通过 |
| 点击水域拦截（`selected = None`） | 通过 |
| 相邻中立地出征占领（领地 5 → 6） | 通过 |
| 内政面板 / 武将面板打开 | 通过 |
| 敌格 → 战斗场景 → 结算 → 返回沙盘 | 通过 |
| 存档写入 + 刷新后「继续赛季」可用 | 通过 |
| `console.error` / `pageerror` | 0 条 |

视觉修复记录：

| 问题 | 处理 |
|---|---|
| favicon 404 | `index.html` 内联空图标 `<link rel="icon" href="data:,">` |
| 沙盘偏小、右下留白 | `theme.js` 的 `HEX_S` 由 `31` 调为 `34` |
| 武将面板战法卡/预览/按钮重叠 | 重写 `HeroPanel.js`：左右严格分栏、2×2 大卡、预览区下移、命中区避让按钮、提示行与页脚按钮留间距 |
| 战法四分类卡片不足 | `data.js` 战法由 8 个扩到 16 个，每类 4 张 |
| 地块颜色无说明 | `MapScene.js` 右栏底部新增「地块图例」常驻区（8 类 + 金边说明） |
