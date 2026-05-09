# 查机 · Aircraft Finder

> 用注册号反查全球主要商业航司飞机的机型、航司、所属联盟和典型客舱布局。手机友好，纯静态，零后端。

🌐 在线查询：<https://nightlemon.github.io/cn-aircraft-finder/>

## 这是什么

一个能用 `B-2445` / `N12345` / `JA381A` 这样的注册号（或 `国航 A350`、`达美 738`、`星空联盟 777` 这种自由组合）反查全球主要商业飞机的网页应用。

**覆盖范围**：约 **3.5 万架**，含**三大航空联盟全部成员**（星空 / 天合 / 寰宇一家）+ 主要独立 / 廉价 / 货运航司。

| 航空联盟 | 飞机数 | 主要成员 |
| --- | --- | --- |
| ⭐ **Star Alliance（星空联盟）** | ~5,900 | 国航、深航、加航、汉莎、瑞航、奥航、北欧、TAP、土耳其、Aegean、新航、泰航、ANA、印航、长荣、韩亚、Avianca、Copa、埃及、埃塞、南非、Brussels、克罗地亚、新西兰… |
| ✈️ **SkyTeam（天合联盟）** | ~4,700 | 东航、厦航、华航、达美、AF/KL、Air Europa、ITA、维珍大西洋、大韩、Garuda、越航、阿根廷、墨航、肯航、沙特、TAROM、MEA… |
| 🌐 **oneworld（寰宇一家）** | ~3,600 | 国泰、美航、英航、芬航、伊比利亚、阿拉斯加、日航、马航、阿曼、澳航、卡塔尔、摩洛哥、约旦、斯里兰卡、斐济（connect） |
| 独立 / 廉航 / 货运 | ~21,000 | 阿联酋、阿提哈德、Flydubai、维珍澳洲、Norse Atlantic、瑞安、易捷、维兹、Spirit、Frontier、JetBlue、Breeze、Avelo、亚航(X)、春秋、九元、宿务、IndiGo、SpiceJet、Akasa、Vistara、FedEx、UPS、Atlas、Polar、Cargolux、汉莎货运、卡塔尔货运、新航货运、顺丰、邮航、国货航、中货航… |

输入 `B-2445`，得到：

- ✈️ **机型**：波音 747-400（B744 / Boeing 747-4J6）
- 🏢 **航司**：中国国际航空（国航，CCA / CA）⭐ 星空联盟
- 💺 **典型客舱布局**：10F + 42C + 30W + 262Y（共 344 座）

## 怎么用

打开页面就能搜：

| 想找什么 | 输什么 |
| --- | --- |
| 单架飞机 | `B-2445`、`N12345`、`JA381A`、`G-XWBA` |
| 某航司全机队 | `国航` / `Air China` / `CCA`、`达美` / `Delta`、`Lufthansa` |
| 某机型 | `A350` / `B789` / `波音 787` |
| 联盟成员 | `星空联盟` / `Star Alliance` / `天合 350` / `寰宇 380` |
| 组合 | `国航 A350` / `达美 350` / `星空 777` |
| 高级筛选 | 顶部「所有地区」+「所有联盟」+「所有类别」三个下拉 |

支持 URL 直链：`?q=B-2445` 或 `?reg=B-2445`。

## 数据来源

| 字段 | 来源 |
| --- | --- |
| 注册号 / ICAO24 / 机型代码 / 运营人 ICAO / 序列号 / 出厂年 / 注册到期日 | [OpenSky Network](https://opensky-network.org/) 月度公开飞机数据库（CC-BY-NC） |
| **实时活跃判定**（"久未活跃"标签） | [tar1090-db / Mictronics](https://github.com/wiedehopf/tar1090-db) 每周更新的 ADS-B 飞机数据库 |
| 航司中英文名 / 简称 / IATA 代码 / 所属联盟 | 本仓库 [`data/operators.json`](data/operators.json) 手工维护 |
| 机型中英文名 / 类别 | 本仓库 [`data/aircraft_types.json`](data/aircraft_types.json) 基于 ICAO Doc 8643 |
| 典型客舱布局（F/C/W/Y） | 本仓库 [`data/cabin_layouts.json`](data/cabin_layouts.json) 基于公开座位图人工整理 |

> ⚠️ **关于客舱布局**：同一航司同一机型常有 2~3 种配置（如国航 738 既有 8C+147Y 又有 8C+150Y）。本工具显示的是 **典型布局**，并非每架飞机的实际座椅图。
>
> ⚠️ **关于过滤**：为控制数据量，build 脚本只保留能匹配到 ~230 家白名单航司的飞机。私人飞机/通用航空/军用机一般不在内（中国大陆/港澳台注册号宽松保留）。
>
> 中文资讯参考：[民航休闲小站](http://www.xmyzl.com/?mod=jidui)。

## 数据规模与性能

- 输入 CSV：~600 万条全球记录（OpenSky 月度快照，~110 MB）
- 输出 `aircraft.json`：~35,000 条 / ~13 MB（**gzip 后约 700 KB**）
- GitHub Pages 默认开 gzip，移动 4G 首次加载约 1~2 秒，刷新走 HTTP 缓存。

## 本地运行

```bash
python scripts/fetch_opensky.py     # 下载最新月度 CSV (~100 MB)
python scripts/build_data.py        # 构建 public/data/aircraft.json
cd public && python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 自动更新

`.github/workflows/deploy.yml` 配置了：

- **每月 5 日** 自动从 OpenSky 拉取最新数据，重建 `aircraft.json` 并提交。
- **每次 push 到 main** 自动重新部署到 GitHub Pages。

## 维护：怎么补数据？

- 新航司：编辑 [`data/operators.json`](data/operators.json)，往 `by_icao` 加一条 ICAO 直查记录，或往 `by_owner_keyword` 加一条 owner/operator 字符串前缀匹配；记得设置正确的 `region` 和（如适用）`alliance: "star" | "skyteam" | "oneworld"`。
- 新机型：编辑 [`data/aircraft_types.json`](data/aircraft_types.json)。
- 新客舱：编辑 [`data/cabin_layouts.json`](data/cabin_layouts.json) 的 `by_operator_type`，键格式 `<航司ICAO>:<typecode>`，例如 `DAL:A359`。
- 改完跑一次 `python scripts/build_data.py` 重建即可。

### 客舱布局错了？

每张卡片的客舱条右上角有一个 **报错 ✏️** 链接，点了会跳到 GitHub Issue 模板（带键和当前布局），把正确配置和来源（航司官网链接 / SeatMaestro / AeroLOPA 截图）填进去就行。

## 项目结构

```
cn-aircraft-finder/
├── public/                 # 静态站点根目录（GH Pages 直接发布）
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── data/
│       ├── aircraft.json   # 构建产物，前端 fetch
│       └── meta.json
├── data/                   # 数据源（手工维护）
│   ├── operators.json      # 航司 ICAO/owner 关键词 → 中文名 + 联盟 (~230 家)
│   ├── aircraft_types.json # ICAO typecode → 中英机型名 / 类别 (~120 种)
│   ├── cabin_layouts.json  # (航司, 机型) → 典型客舱布局
│   └── raw/                # 缓存原始 OpenSky CSV（.gitignore）
├── scripts/
│   ├── fetch_opensky.py    # 抓最新月度 CSV
│   └── build_data.py       # CSV → public/data/aircraft.json
└── .github/workflows/deploy.yml   # CI/CD
```

## 许可

- 代码：MIT。
- 数据：原始飞机数据库版权属 OpenSky Network，遵循 CC-BY-NC 4.0；本仓库仅作非商业的查询展示用途。手工整理的运营商映射、机型映射和客舱布局表按 CC-BY-SA 4.0 释出，欢迎修订并提 PR。
