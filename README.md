# 查机 · Aircraft Finder

> 用注册号反查全球主要商业航司飞机的机型、航司、所属联盟和典型客舱布局。手机优先，纯静态，零后端。

🌐 在线查询：<https://nightlemon.github.io/cn-aircraft-finder/>

📋 [项目状态与路线图](docs/STATUS.md) · [数据准确性核查](docs/data-accuracy-audit-2026-11-28.md)

---

## 它能做什么

输入 `B-2445`，得到：

- ✈️ **机型**：波音 747-400（ICAO `B744` / 完整型号 `Boeing 747-4J6`）
- 🏢 **航司**：中国国际航空（国航，CCA / CA）⭐ 星空联盟
- 💺 **典型客舱布局**：10F + 42C + 292Y（共 344 座，含彩色比例条和图例）
- 📸 **飞机照片**（来自合作伙伴 API，含摄影师署名链接）
- 🟢 **登记状态**：登记注销、号码复用及资料待核实提示
- 🔗 **跳转链接**：飞行追踪 / 真实座位图 / 照片库 等
- 📅 **关键日期**：出厂年、登记日期、注销日（如有）
- 🆔 **技术细节**：序列号、ICAO24 hex

## 数据规模

下列数字来自 2026-11-28 的数据构建。

| 项目 | 数量 |
| --- | --- |
| 总飞机数 | 57,148 架 |
| 匹配 tar1090 | 51,004 |
| 未匹配 tar1090 | 4,534 |
| 登记已注销 | 1,610 |
| 已命名的 ICAO 航司映射 | 264 |
| 已命名的机型代码 | 154 |
| 航司与机型的专属客舱记录 | 651 条 |
| 已识别航司的商用飞机中，能匹配航司专属客舱的记录 | 20,067 / 28,400（70.7%） |

### 按地区分布

| 地区 | 飞机数 | 地区 | 飞机数 |
| --- | --- | --- | --- |
| 美国 | 17,011 | 欧陆 | 10,348 |
| 中国大陆 | 7,382 | 拉美 | 4,167 |
| 东南亚 | 2,669 | 公务机 | 2,072 |
| 英国/爱尔兰 | 2,177 | 中东 | 2,091 |
| 俄罗斯/独联体 | 1,757 | 加拿大 | 1,612 |
| 南亚 | 1,345 | 大洋洲 | 1,109 |
| 日本 | 963 | 非洲 | 932 |
| 韩国 | 664 | 台湾 | 352 |
| 香港 | 372 | 澳门 | 31 |

### 三大联盟全部覆盖

| 联盟 | 飞机数 |
| --- | --- |
| ⭐ Star Alliance | 7,079 |
| ✈️ SkyTeam | 4,941 |
| 🌐 oneworld | 4,394 |

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
| 注册号 / ICAO24 / 机型代码 / 序列号 / 出厂年 / 注册到期日 | [OpenSky Network](https://opensky-network.org/) 最新可用公开飞机快照（CC-BY-NC 4.0，快照月份显示在页面顶部） |
| 飞机补录与资料匹配 | [tar1090-db / Mictronics](https://github.com/wiedehopf/tar1090-db) 飞机元数据库 |
| 登记身份核验 | [美国 FAA](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download) 和[澳门民航局](https://www.aacm.gov.mo/en/industry-page/RegisteredAircraft) 的登记资料 |
| 已核查的座位图入口 | [座位图目录](data/seat_maps.json) 记录具体构型或航司机队页 |
| 航司中英文名 / 简称 / IATA 代码 / 所属联盟 | 本仓库 [`data/operators.json`](data/operators.json) 手工维护 |
| 机型中英文名 / 类别 | 本仓库 [`data/aircraft_types.json`](data/aircraft_types.json) 基于 ICAO Doc 8643 |
| 典型客舱布局 | 本仓库 [`data/cabin_layouts.json`](data/cabin_layouts.json) 整理自公开座位图与航司官网 |
| 飞机照片 | [Planespotters.net](https://www.planespotters.net/photo/api) 公开 Photo API（含摄影师署名） |

> **客舱布局**按航司和机型匹配。同一组合可有多种配置，已查到的其他版本写在卡片备注中。实际航班请看航司选座图。[客舱数据核查记录](docs/cabin-layout-audit.md)
>
> 快照主要覆盖已知航司和商用飞机。大中华区注册号保留范围更宽。

## 登记状态和资料匹配

| 标签 | 依据 |
| --- | --- |
| 登记已注销 | FAA 历史登记与注册号、机身序列号匹配 |
| 注册号已重新分配 | FAA 历史登记确认旧机身，现登记对应另一机身 |
| 注册号或机型待核实 | 数据源给出冲突身份或机型 |
| 登记状态待核实 | OpenSky 快照所载到期日已过 |
| 未匹配 tar1090 | 当前 tar1090 快照缺少同一注册号及六位地址的记录 |

实时飞行情况可通过卡片上的追踪入口查询。

## 本地运行

```bash
# 准备 Python 3.12 和用于拼音字段的 pypinyin
python -m pip install pypinyin
python scripts/fetch_opensky.py     # 下载最新可用 OpenSky 与 tar1090 快照
python scripts/build_data.py        # 构建 public/data/aircraft.json + meta.json + cabin_layouts.json
cd public && python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

前端优先加载 7.6 MiB 的列式文件。行式兼容文件约 23.4 MiB。

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

舱位代码为 `F` 头等舱、`C` 公务舱、`W` 超级经济舱或航司指定的优选座位、`Y` 经济舱。有多个版本时，在 `notes` 中写明可核实的差异。若航司只公布了总容量，可在 `layout` 中说明分舱情况，省略未经证实的分舱数。把对应的航司资料或座位图链接记入[核查记录](docs/cabin-layout-audit.md)。

只修改客舱时，用现有飞机快照更新行式数据、列式数据和照片识别后使用的查询表。

```bash
python scripts/build_data.py --cabins-only
python -m unittest discover -s tests
```

座位图链接在 `data/seat_maps.json` 维护。具体构型填到 `by_operator_type`，只有航司机队页时填到 `by_operator`。

### 更新登记核验数据

从 FAA 下载 `ReleasableAircraft.zip` 后，用公开文件的实际快照日期重新生成经序列号校验的修订。原始 ZIP 留在本地。

```bash
python scripts/update_faa_corrections.py /path/to/ReleasableAircraft.zip --date YYYY-MM-DD
python scripts/build_data.py
python -m unittest discover -s tests
```

澳门登记册及逐架核实的航司机型更正保存在 `data/airframe_corrections.json`。个别机身的更正只有在六位地址匹配时生效。

### 客舱布局有误？最快流程

每张卡片的客舱条右上角有 **报错 ✏️** 链接，点击会跳到 GitHub Issue 模板，自动带上航司机型键和当前布局。请附上具体配置、座位图或航司链接。如能确认注册号或客舱版本，也请一并填写。

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
│   ├── cabin_layouts.json             # 客舱布局
│   └── seat_maps.json                 # 核实的座位图入口
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
