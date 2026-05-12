# 查机 · Aircraft Finder

> 用注册号反查全球主要商业航司飞机的机型、航司、所属联盟和典型客舱布局。手机优先，纯静态，零后端。

🌐 在线查询：<https://nightlemon.github.io/cn-aircraft-finder/>

📋 项目状态与路线图：[`docs/STATUS.md`](docs/STATUS.md)

---

## 它能做什么

输入 `B-2445`，得到：

- ✈️ **机型**：波音 747-400（ICAO `B744` / 完整型号 `Boeing 747-4J6`）
- 🏢 **航司**：中国国际航空（国航，CCA / CA）⭐ 星空联盟
- 💺 **典型客舱布局**：10F + 42C + 30W + 262Y（共 344 座，含彩色比例条 + 图例）
- 📸 **飞机照片**（来自合作伙伴 API，含摄影师署名链接）
- 🟢 **服役状态**：在役 / 久未活跃 / 已注销（含日期）
- 🔗 **跳转链接**：飞行追踪 / 真实座位图 / 照片库 等
- 📅 **关键日期**：出厂年、服役起始、注销日（如有）
- 🆔 **技术细节**：序列号、ICAO24 hex

## 数据规模

| 项目 | 数量 |
| --- | --- |
| 总飞机数 | ~35,000 架 |
| 在役 | ~31,000 |
| 久未活跃（疑似退役） | ~3,500 |
| 已注销（民航局已撤销） | ~500 |
| 白名单航司 | 230+ |
| 机型代码 | 137 |
| 整理过的 (航司, 机型) 客舱配置 | 576 条 |
| 商业机队中显示真实运营人配置 | 约 74% |

### 按地区分布

| 地区 | 飞机数 | 地区 | 飞机数 |
| --- | --- | --- | --- |
| 美国 | 9,302 | 拉美 | 2,869 |
| 中国大陆 | 6,550 | 东南亚 | 1,501 |
| 欧陆 | 5,509 | 中东 | 1,494 |
| 英国/爱尔兰 | 1,241 | 公务机 | 1,095 |
| 加拿大 | 965 | 俄罗斯/独联体 | 844 |
| 南亚 | 795 | 日本 | 732 |
| 大洋洲 | 705 | 韩国 | 501 |
| 非洲 | 417 | 台湾 | 360 |
| 香港 | 344 | 澳门 | 18 |

### 三大联盟全部覆盖

| 联盟 | 飞机数 |
| --- | --- |
| ⭐ Star Alliance | ~5,900 |
| ✈️ SkyTeam | ~4,700 |
| 🌐 oneworld | ~3,600 |

## 怎么用

打开页面就能搜：

| 想找什么 | 输什么 |
| --- | --- |
| 单架飞机 | `B-2445`、`N12345`、`JA381A`、`G-XWBA`（支持 `b2445` 不带连字符） |
| 某航司全机队 | `国航` / `Air China` / `CCA` / `gh` / `guohang`（支持拼音首字母与全拼） |
| 某机型 | `A350` / `B789` / `波音 787` |
| 联盟成员 | `星空联盟` / `天合 350` / `寰宇 380` |
| 组合 | `国航 A350` / `达美 350` / `星空 777` |
| 高级筛选 | 顶部「所有地区」+「所有联盟」+「所有状态」+「所有类别」 |
| 点航司名 | 一键查该航司全机队 |
| 键盘快捷键 | `/` 聚焦搜索框，`Esc` 清空 |

URL 直链可分享筛选状态：`?q=B-2445&region=mainland&service=active`。也支持 `?reg=B-2445`。

## 数据来源

| 字段 | 来源 |
| --- | --- |
| 注册号 / ICAO24 / 机型代码 / 序列号 / 出厂年 / 注册到期日 | [OpenSky Network](https://opensky-network.org/) 月度公开飞机数据库（CC-BY-NC 4.0） |
| 实时活跃判定 | [Mictronics tar1090-db](https://github.com/wiedehopf/tar1090-db) 每周更新的 ADS-B 飞机数据库 |
| 航司中英文名 / 简称 / IATA 代码 / 所属联盟 | 本仓库 [`data/operators.json`](data/operators.json) 手工维护 |
| 机型中英文名 / 类别 | 本仓库 [`data/aircraft_types.json`](data/aircraft_types.json) 基于 ICAO Doc 8643 |
| 典型客舱布局 | 本仓库 [`data/cabin_layouts.json`](data/cabin_layouts.json) 整理自公开座位图与航司官网 |
| 飞机照片 | [Planespotters.net](https://www.planespotters.net/photo-api) 公开 Photo API（含摄影师署名） |

> ⚠️ **客舱布局** 显示的是 **典型布局**，并非每架飞机的实际座椅图。同一航司同一机型常有多种实际配置。
>
> ⚠️ **过滤** 为控制数据量，构建脚本只保留能匹配到白名单航司的飞机。私人 / 通用航空 / 军用机一般不在内（中国大陆/港/澳/台 B- 注册号宽松保留）。

## 服役状态分三层

| 状态 | 标签 | 判定依据 |
| --- | --- | --- |
| 在役 | 无 | 在 Mictronics 实时 ADS-B 数据库中 |
| 久未活跃 | 黄色 `久未活跃` | 在 OpenSky 但 **不在** Mictronics —— 多半已停飞 / 封存 / 转售 |
| 已注销 | 红色 `已注销 · 日期` | OpenSky 的 `regUntil` 早于今天 —— 民航局已撤销注册 |

## 本地运行

```bash
# 准备：Python 3.8+，能联网下载数据
python scripts/fetch_opensky.py     # 下载月度 OpenSky CSV (~100 MB) + Mictronics 数据库 (~33 MB)
python scripts/build_data.py        # 构建 public/data/aircraft.json + meta.json + cabin_layouts.json
cd public && python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

性能：输出 `aircraft.json` 约 13 MB（gzip 后 ~700 KB）。GitHub Pages 默认开 gzip，移动 4G 首次加载约 1~2 秒。

## 自动更新

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

- **每月 5 日 03:30 UTC** 自动从上游拉最新数据、重建并提交
- **每次 push 到 main** 自动重新部署到 GitHub Pages

## 怎么贡献

### 添加航司

编辑 [`data/operators.json`](data/operators.json)：

- 已知 ICAO 三字代码 → 加到 `by_icao`：
  ```json
  "CCA": {
    "name_zh": "中国国际航空", "short_zh": "国航",
    "name_en": "Air China", "iata": "CA",
    "region": "mainland", "alliance": "star"
  }
  ```
- 只知道英文名 → 加到 `by_owner_keyword`，作为前缀匹配。
- `region` 枚举：`mainland / hk / macau / tw / us / ca / eu / uk / jp / kr / sea / in / me / oceania / ru / latam / africa / biz / gov`
- `alliance` 可选：`star / skyteam / oneworld`

### 添加机型

编辑 [`data/aircraft_types.json`](data/aircraft_types.json)：
```json
"A35K": {"name_en": "Airbus A350-1000", "name_zh": "空客 A350-1000", "category": "widebody"}
```

### 添加 / 修正客舱布局

编辑 [`data/cabin_layouts.json`](data/cabin_layouts.json) 的 `by_operator_type`：
```json
"CCA:A359": {"layout": "32C + 24W + 256Y", "total": 312, "notes": "国航 A350-900 三舱"}
```

**舱位代码**：`F` 头等舱 / `C` 公务舱 / `W` 超级经济舱 / `Y` 经济舱。

改完跑一次：
```bash
python scripts/build_data.py
```

### 客舱布局有误？最快流程

每张卡片的客舱条右上角有 **报错 ✏️** 链接，点击会跳到 GitHub Issue 模板（自动带键 `<航司ICAO>:<typecode>` 和当前布局）。填上正确配置和来源 → Submit。维护者看到 issue 后改一行 → push → 一分钟生效。

## 项目结构

```
cn-aircraft-finder/
├── public/                            # 静态站点根目录（GH Pages 直接发布）
│   ├── index.html                     # 主页面
│   ├── style.css                      # 移动端优先样式，含明/暗模式
│   ├── app.js                         # 全部前端逻辑
│   └── data/                          # 构建产物
├── data/                              # 手工维护的数据源
│   ├── operators.json                 # 航司白名单
│   ├── aircraft_types.json            # 机型字典
│   └── cabin_layouts.json             # 客舱布局
├── scripts/
│   ├── fetch_opensky.py               # 数据下载
│   └── build_data.py                  # CSV → JSON
├── .github/workflows/deploy.yml       # CI/CD
├── docs/STATUS.md                     # 项目状态与路线图
└── README.md
```

## 许可

- **代码**：MIT
- **手工整理的运营商映射、机型映射、客舱布局表**：CC-BY-SA 4.0
- **上游 OpenSky 数据**：CC-BY-NC 4.0 —— 本仓库仅作非商业的查询展示用途

欢迎修订并提 PR / Issue。

## 致谢

- [OpenSky Network](https://opensky-network.org/) 提供公开飞机数据库
- [Mictronics / wiedehopf](https://github.com/wiedehopf/tar1090-db) 维护的实时 ADS-B 飞机数据库
- [Planespotters.net](https://www.planespotters.net/) 提供公开的 Photo API
- [民航休闲小站](http://www.xmyzl.com/?mod=jidui) —— 最初灵感来源
