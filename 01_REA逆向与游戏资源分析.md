# 《三国志·战略版》REA 逆向与游戏资源分析报告

> 样本：`com.aligames.sgzzlb.aligames` v2085.1788（豌豆荚官方包）
> 工具：`rea-agents` v6.8.0（Node 24.22.2）+ apktool 2.12.1 + JDK 20
> 用途：作为后续《需求规格文档》与 Phaser 3 实现的事实依据
> 日期：2026-11-10

---

## 0. 结论速览

| 结论 | 证据 | 对实现的指导 |
|---|---|---|
| **这是横屏游戏** | `cn.gosdk.screenType = L`、`notch.config = portrait\|landscape`、18 张商店截图均为横屏构图 | Phaser 3 采用 **1280×720 横屏设计分辨率**，竖屏设备提示旋转 |
| **自研 ejoy2dx 引擎 + Lua 热更** | 主 Activity `com.ejoy2dx.s3client.S3Activity`；`assets/shortcutsdk/ejoysdk_lua/` 下 460+ Lua | 玩法逻辑不在 Java 层，不指望反编译 dex 得到规则 |
| **95% 体积是加密资源包** | `assets/pkg/*.elp` 共 865 个 / 3558.5 MB，占 APK 94.6% | 只做「资源层 + 视觉层」静态取证，不脱壳（投入产出比极差） |
| **可复用的是设计语言，不是资产** | 截图 HUD、州旗、格子沙盘、战法分类均可量化 | 抄规则（横屏 / 羊皮纸 / 金描边 / 四资源 / 格子 / 行军箭头），**不照搬立绘、Logo、宣传文案** |

---

## 1. 样本与校验

| 项 | 值 |
|---|---|
| 名称 / 包名 | 三国志·战略版 / `com.aligames.sgzzlb.aligames` |
| 版本 | versionName `2085.1788`，versionCode `2085` |
| 文件大小 | 3,938,666,367 B（3756.2 MB / 3.67 GB） |
| MD5 | `9704909a88ababe572e3aa22eb87d721` |
| SHA256 | `c1983072c31e35f03900bd89c441f5b68c6f44e2dbe984cdbb5486218c8e16a6` |
| 文件头 | `PK\x03\x04`（ZIP/APK 合法） |
| 下载直链 | `https://downali.wandoujia.com/s1/4/1/2026101015240115_com.aligames.sgzzlb.aligames.apk?...` |
| 直链实测 | HTTP 206 + `PK` 头 + Content-Range 3756.20 MB |
| minSdk / targetSdk | 21 / 30 |
| 本地路径 | `/workspace/三国志战略版/apk/三国志战略版_v2085.1788_official.apk` |

---

## 2. REA 执行记录

当前沙箱是干净环境，技能文档里「本机已装好 rea」并不成立，现场补装了工具链：

| 步骤 | 命令 | 结果 |
|---|---|---|
| 环境 | `nvm install 24 && npm i -g rea-agents` | ✅ rea@6.8.0（Node 22.13 缺 `zstdDecompress`，升 24 后可用） |
| 依赖 | `gh-proxy` 拉 apktool 2.12.1 + JDK 20 | ✅ `/opt/android-tools/apktool` |
| 体检 | `rea doctor` | ⚠️ Hopper / Ghidra / IDA / jadx 引擎缺失（二进制逆向引擎，APK 资源层不需要） |
| 概览 | `rea analyze <apk> --format json` | ❌ `capability_unavailable / unsupported_provider`：auto 选中的候选是 ghidra/hopper/ida/kuna，均不接受 APK 容器 |
| **资源解码** | `rea decode-android-resources <apk> --format json` | ✅ `coverage=complete`、`decoded_file_count=2489`、`confidence=observed`、51 KB Evidence JSON |

> 原始产物：`rea_analyze.json`（失败记录）、`rea_resources.json`（解码证据）、`rea_*.err`。
> 结论与技能文档一致：**APK 只做静态资源取证**，`analyze` 的失败是工具定位问题，不是样本问题，不重试、不脱壳。

---

## 3. 清单层取证（AndroidManifest）

### 3.1 关键元数据

| 键 | 值 | 含义 |
|---|---|---|
| `cn.gosdk.screenType` | `L` | **Landscape 横屏**（最强证据） |
| `notch.config` | `portrait\|landscape` | 刘海适配双方向 |
| `android.max_aspect` | `2.4` | 超宽屏适配 |
| 主 Activity | `com.ejoy2dx.s3client.S3Activity` | 简悦自研 ejoy2dx 引擎入口（s3 = 三国志战略版） |
| `supportStyle` | `scene\|voip` | 场景 + 实时语音（Agora） |

### 3.2 权限（25 个，按能力归类）

| 类别 | 权限 |
|---|---|
| 网络 | `INTERNET`、`ACCESS_NETWORK_STATE`、`ACCESS_WIFI_STATE`、`CHANGE_NETWORK_STATE` |
| 存储 / 更新 | `READ/WRITE_EXTERNAL_STORAGE`、`MANAGE_EXTERNAL_STORAGE`、`REQUEST_INSTALL_PACKAGES`（热更下载 elp 资源包） |
| 推送 / 保活 | `POST_NOTIFICATIONS`、`FOREGROUND_SERVICE`、`WAKE_LOCK`、`VIBRATE`、`REORDER_TASKS`、`GET_TASKS` |
| 语音 / 多媒体 | `RECORD_AUDIO`、`MODIFY_AUDIO_SETTINGS`、`CAMERA`（对应 Agora 语音、扫码、头像裁剪） |
| 设备 / 定位 | `READ_PHONE_STATE`、`ACCESS_COARSE/FINE_LOCATION`、`READ_SETTINGS`、`SYSTEM_ALERT_WINDOW` |
| 日历 | `READ/WRITE_CALENDAR`（活动预约提醒） |

### 3.3 组件

- **35 个 Activity**：除 `S3Activity` 外几乎全是渠道 SDK —— 微信 / QQ / 微博 / 支付宝 / 阿里推送 / 小米 / 华为 HMS / 荣耀 / vivo / OPPO / 友盟 / 阿里安全 `middletier` / ejoy 扫码裁剪与隐私协议 / `com.ejoy.shadow.runtime.*`（插件化代理）。
- **24 个 Service**：推送通道（accs / agoo / HMS / MiPush / vivo）、崩溃日志上传。
- **资源字符串 129 条**：`app_name = 三国志·战略版`；业务文案集中在「游戏更新 / 下载 / 退出 / 扫码 / 分享 / 权限」等壳层，**没有一条玩法文案**。

> 判断：Java 层是「壳 + 渠道 SDK」，玩法与美术全部下沉到 elp 资源包。这与技能文档第 2 节「加固 / 私有引擎只做资源层取证」完全吻合。

---

## 4. 包体结构取证

| 层 | 证据 | 结论 |
|---|---|---|
| 总量 | 2335 文件 / 3.96 GB 解压后 | 超大型 SLG |
| `assets/` | 1874 个文件；`pkg/` 868、`shortcutsdk/` 464 | 主体是资源与 SDK |
| `assets/pkg/*.elp` | **865 个，3558.5 MB**，单包 10~24 MB | 加密/自定义归档，存放地图、立绘、配置、Lua 字节码 |
| `lib/arm64-v8a` | `libsgmainso-6.6.230703.so`、`libsgmiddletierso*.so`、`libnative-lib.so` | 自研引擎主体（sg = 三国） |
| 音频 | `libfmod.so`、`libfmodstudio.so` | FMOD Studio 音频引擎 |
| 语音 / AI | `libagora-rtc-sdk.so`、`libonnxruntime.so`、`libsherpa-onnx-*.so`、`libaiwakeup.so` | 同盟实时语音 + 端侧语音识别 |
| 安全 | `libsgsecuritybodyso*.so`、`lib_ucsdk_xcrypt.so`、`lib_ucsdk_patch.so` | 加固与反篡改 |
| DEX | 3 个：`classes.dex` 572 KB、`classes2.dex` 8.8 MB、`classes3.dex` 4.3 MB | 相对轻薄，无玩法逻辑 |
| Lua | `assets/shortcutsdk/ejoysdk_lua/vendors/*.lua`（aligames / official_pay / firebase / advsdk / predownload / cloud_game…） | **仅 SDK 渠道适配层**，不是战斗/内政规则 |
| `assets/font/` `skin/` `cornerIcon/` | 3 / 36 / 7 个文件 | 字体与皮肤资源 |

**为什么不继续深挖**：elp 为自定义加密归档，且 Java/SDK Lua 中不含玩法；按 `reverse-apk.md` 的判断准则，继续投入属于「脱壳」，产出极低。本报告改用**商店视觉取证 + 官方玩法描述**补齐 UI/规则依据。

---

## 5. 商店视觉取证（18 张截图）

来源：应用宝 6 张 + 豌豆荚 5 张 + PP助手 5 张 + 3 张 icon，路径 `screenshots/`。
说明：商店图多为「武将立绘 + 赛季文案」的宣传海报，但**海报顶部复用了真实游戏 HUD**，中部是真实州域沙盘，因此可直接提取界面规格。

### 5.1 顶部 HUD 规格（多张截图一致）

| 区域 | 字段与取值 | 样式 |
|---|---|---|
| 左上角 | 圆形君主头像 + 君主名「刘备你别走」 | 深色圆底，金边 |
| 君主属性 | 名声 `20000`、领地 `197/200`、势力 `41520` | 12px 浅金小字，两行 |
| 货币 | 玉璧 `2103`、金铢 `300`、铜币 `26万` | 每项右侧带 `+` 号 |
| 四资源 | 木材 `+13万 322万/601万`、铁矿 `+13万 347万/601万`、石料 `+13万 229万/601万`、粮草 `+13万 207万/601万` | 格式：**产量 / 当前 / 上限** |

### 5.2 州域与沙盘规格

| 元素 | 原版表现 |
|---|---|
| 底图 | 羊皮纸质感，米黄 + 褐色描边，州界为不规则多边形/六边形分块 |
| 州旗 | 竖幅旗，书法字：并州（土黄）、青徐（蓝）、荆益（绿）、淮扬（红），另有凉州 / 巴蜀 / 江汉等 |
| 行军 | **橙色箭头串**沿路径指向目标，可多箭头连续 |
| 交战 | 交叉双剑图标（红色） |
| 资源地 | 麦穗图标（金黄） |
| 复合地形 | 方形格子沙盘：山地高低差、树林、河流/水路、道路、箭塔、攻城器械、燃烧特效 |
| 赛季目标 | 中央大字 `1200` + 「霸业」印章；文案「背靠背轮战 抢1200霸业」「双倍人数赛季 12势力混战」 |

### 5.3 战法界面规格（「研兵悟道」）

| 元素 | 原版表现 |
|---|---|
| 顶栏 | 标题「研兵悟道」、战法点 `885698` + `+`、帮助 `?`、返回按钮 |
| 左侧 | 竖排 4 个圆形分类：**指挥 / 主动 / 突击 / 阵法** |
| 战法卡 | 竹简卷轴样式，卡名「治疗」「先攻」，`+` 号空卡位 |
| 计数 | 战法 `10/50`、队伍 `1/2` |
| 预览面板 | 「满级效果预览」：战法类型（指挥）、发动概率（30%-60%）、预览中 |
| 赛季文案 | 「战法自定义 组合无上限」 |

### 5.4 官方玩法描述（用于业务规则）

> 光荣特库摩正版授权；百万格拟真沙盘；五大兵种克制；自由行军、实时转向截击；因地制宜部署箭塔/拒马；万人同图军团战；不卖 VIP 不卖资源；赛季制霸业争夺；内政委任 / 寻访；武将缘分与阵营加成（魏蜀吴群）。

---

## 6. 游戏资源分析（mini-game-builder 铁律 5）

> 本节是**实现必须逐项对齐的规格表**。Demo 不使用任何原版美术资产，全部由 Phaser Graphics 程序化绘制；下表定义的是「可量化的设计语言」。

### 6.1 美术风格

| 维度 | 规格 |
|---|---|
| 画风 | 写实国风 + 羊皮纸军事沙盘；**Demo 降级为矢量低保真沙盘**（色块 + 描边 + 图标符号） |
| 视角 | 俯视 2.5D 斜向格子地图 |
| 主色调 | 羊皮纸米黄 `#D8C49A`、深褐 `#3B2A18`、墨黑 `#2A2018` |
| 强调色 | 金 `#E8C56A` / 亮金 `#F5D98B`、行军橙 `#F07A28`、交战红 `#C0392B` |
| 阵营色 | 并州 `#C9A44C`、青徐 `#2C5A8C`、荆益 `#3B6B4A`、淮扬 `#9C3B2E`、中立 `#8C8272` |
| 字体 | 标题用衬线/书法感（Demo 用 `serif`），数值用等宽无衬线（Demo 用 `monospace`） |

### 6.2 图片资源与命名规范

| 资源 | 原版 | Demo 实现 | 命名 |
|---|---|---|---|
| 沙盘底图 | 羊皮纸贴图 | `Graphics` 渐变 + 噪点纹理 | `bg_parchment` |
| 地块 | 3D 地形贴图 | 六边形/方形色块 + 描边 | `tile_{terrain}_{lv}` |
| 城池 | 建筑模型 | 方形城垛符号 + 势力色 | `city_{owner}` |
| 部队 | 3D 兵模 | 圆形令牌 + 兵种字 | `troop_{heroId}` |
| 州旗 | 布面旗帜 | 矩形旗 + 书法州名 | `banner_{stateId}` |
| 行军箭头 | 橙色光带 | 三角箭头串 | `arrow_march` |
| 交战 / 资源地 | 双剑 / 麦穗 | 字符图标 `⚔` `✦` | `icon_battle` / `icon_res` |
| 战法卡 | 竹简 | 圆角矩形 + 金边 | `card_tactic` |

> 图集尺寸：Demo 不用 spritesheet；所有元素按 1280×720 设计分辨率绘制，逻辑坐标与 `theme.js` 常量一一对应。

### 6.3 音乐音效清单与触发点

| 类型 | 文件（建议 ogg/mp3） | 触发点 |
|---|---|---|
| BGM | `bgm_map.ogg`（沉稳鼓 + 古筝） | 进入沙盘主界面循环 |
| BGM | `bgm_battle.ogg` | 战斗结算界面 |
| SFX | `sfx_click.mp3` | 任意按钮点击 |
| SFX | `sfx_march.mp3` | 下达出征指令 |
| SFX | `sfx_arrive.mp3` | 部队到达目标格 |
| SFX | `sfx_occupy.mp3` | 占领成功 |
| SFX | `sfx_battle.mp3` | 触发交战 |
| SFX | `sfx_recruit.mp3` | 征兵完成 |
| SFX | `sfx_warn.mp3` | 体力不足 / 资源不足 / 仓库满 |
| SFX | `sfx_victory.mp3` | 赛季目标达成 |

> Demo 用 WebAudio 合成短音（不引入外部音频文件），触发点与上表**逐项对应**，函数名 `Sfx.play('<id>')`。

### 6.4 UI 效果规格

| 元素 | 规格（设计分辨率 1280×720） |
|---|---|
| HUD 顶栏 | 高 `56px`，深褐半透明 `rgba(30,23,16,.88)`，底部 1px 金线；字段间距 `16px` |
| 资源项 | 图标 `16px` + 数值 `14px monospace` + 产量 `12px` 金色 |
| 州旗 | `96×44px`，下方三角缺口，书法字 `20px` |
| 主按钮 | `136×44px`，金底 `#E8C56A`，圆角 `8px`；hover 亮金；disabled `#6B6152` |
| 次按钮 | `136×44px`，透明底 + `1px #E8C56A` 描边 |
| 面板 | `520×420px`，`rgba(30,23,16,.94)` + `2px #8C7A52` 边框，标题 `22px` 金色 |
| 弹窗遮罩 | `rgba(0,0,0,.6)`，居中，入场 `scale 0.92→1` + `alpha 0→1`，`160ms` |
| Toast | 底部居中，`14px`，`2s` 自动消失 |
| 间距栅格 | `8 / 12 / 16 / 24 / 32` |
| 过渡 | 场景切换淡入淡出 `250ms`；行军按格插值移动 |

### 6.5 配色与度量常量对照表

| 语义 | 常量名 | 取值 | 使用处 |
|---|---|---|---|
| 羊皮纸底 | `PARCHMENT` | `#D8C49A` | 沙盘底 |
| 深褐 | `BROWN_DEEP` | `#3B2A18` | HUD / 面板底 |
| 墨色 | `INK` | `#2A2018` | 正文 |
| 主金 | `GOLD` | `#E8C56A` | 按钮 / 描边 / 标题 |
| 亮金 | `GOLD_LIGHT` | `#F5D98B` | 高亮 / hover |
| 行军橙 | `MARCH` | `#F07A28` | 行军箭头 |
| 交战红 | `BATTLE` | `#C0392B` | 交战标记 |
| 并州 | `STATE_BZ` | `#C9A44C` | 州旗 |
| 青徐 | `STATE_QX` | `#2C5A8C` | 州旗 |
| 荆益 | `STATE_JY` | `#3B6B4A` | 州旗 |
| 淮扬 | `STATE_HY` | `#9C3B2E` | 州旗 |
| 字号 | `FS_HUD / FS_BODY / FS_TITLE / FS_BANNER` | `14 / 14 / 22 / 20` | 全局 |

---

## 7. 可复用规则与禁止照搬项

| 可复用（量化规则） | 禁止照搬（品牌资产） |
|---|---|
| 横屏 16:9 设计分辨率、竖屏提示旋转 | 武将立绘（曹操 / 关羽 / 诸葛亮 / 赵云 / 司马懿） |
| 羊皮纸 + 金描边 + 州旗配色的设计语言 | 游戏 Logo、icon、`三国志·战略版` 商标字样 |
| 顶部 HUD 字段（玉璧/金铢/铜币/名声/领地/势力/四资源） | 宣传海报文案原句（「竞逐天子法驾」等） |
| 四资源「产量/当前/上限」格式 | `assets/pkg/*.elp` 内任何贴图、字体、音频 |
| 六边形州域 + 橙色行军箭头 + 双剑/麦穗图标语义 | 原版数值平衡表、武将技能具体数值 |
| 战法四分类（指挥/主动/突击/阵法） | 原版 UI 像素级复刻 |
| 赛季目标（霸业值）与势力值概念 | — |

> 依据 `reverse-apk.md` 第 3.5 节第 6 条：**只取风格，不照搬**。Demo 名称使用《三国沙盘 · 战略原型》，为学习/原型用途。

---

## 8. 证据 → 需求文档 → 代码 映射

| 证据 | 需求文档界面 | 代码模块 |
|---|---|---|
| `screenType=L` + 横屏截图 | 全部界面（横屏基线） | `main.js` Phaser Scale.FIT 1280×720 |
| 顶部 HUD 字段 | 「沙盘主界面」文档 | `ui/Hud.js` |
| 六边形州域 / 行军箭头 / 城池 | 「沙盘主界面」文档 | `scenes/MapScene.js` |
| 四资源产量 / 仓库上限 | 「城池内政界面」文档 | `state.js` 资源 tick |
| 战法四分类 / 队伍 1/2 | 「武将战法界面」文档 | `ui/HeroPanel.js` |
| 交战 / 霸业值 | 「战斗结算界面」文档 | `scenes/BattleScene.js` |
| 865 个 elp / ejoy2dx / Lua | 架构结论（不实现） | —（说明为何纯前端 Mock） |

---

## 9. 遗留与风险（如实说明）

| 项 | 状态 | 说明 |
|---|---|---|
| `rea analyze` | ❌ 失败 | 候选引擎 ghidra/hopper/ida/kuna 不接受 APK 容器；已按技能准则改走 `decode-android-resources`，不作无谓重试 |
| elp 资源包 | ⚠️ 未解包 | 自定义加密归档，脱壳成本高；玩法规则改由官方介绍 + 商店图取证 |
| 运行时抓包 / Frida | ⚠️ 未做 | 无真机与设备端环境，未取网络协议 |
| cherry Go 联机后端 | ⚠️ 未启用 | 本次为**单机可玩 Demo**，无联机/排行榜需求；已预留 `SaveService` / `BattleService` 接口边界 |
| prjtmpl 模板工程 | ⚠️ 未启用 | 为便于浏览器直接预览，采用纯静态 H5 工程；工程结构与模板基建（请求封装/分层）在 README 中给出对应说明 |
| GitHub 上传 | ⚠️ 未执行 | 按用户选择「本地交付到 /workspace，不自动上传 GitHub / 部署服务器」 |

> 下一阶段：`02_需求规格_*.md`（按界面拆分）→ `game/`（Phaser 3 横屏可玩 Demo）。
