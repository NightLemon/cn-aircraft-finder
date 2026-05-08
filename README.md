# 民航查机 · CN Aircraft Finder

> 用注册号反查中国民航飞机的机型、航司和典型客舱布局。手机友好，纯静态，零后端。

🌐 在线查询：<https://nightlemon.github.io/cn-aircraft-finder/>

## 这是什么

一个能用 `B-2445` 这样的注册号（或 `国航 738`、`国泰 A350` 这种自由组合）反查中国民航飞机的网页应用。覆盖中国大陆 / 香港 / 澳门 / 台湾的注册号，以及部分公务机和政府用机，共约 **7,000+ 架**。

输入 `B-2445`，得到：

- ✈️ **机型**：波音 747-400（B744 / Boeing 747-4J6）
- 🏢 **航司**：中国国际航空（国航，CCA / CA）
- 💺 **典型客舱布局**：10F + 42C + 30W + 262Y（共 344 座）

## 怎么用

打开页面就能搜：

| 想找什么 | 输什么 |
| --- | --- |
| 单架飞机 | `B-2445` 或 `b2445` 或 `B-32QQ` |
| 某航司全机队 | `国航` / `南航` / `Air China` / `CCA` |
| 某机型 | `A350` / `B789` / `波音 787` |
| 组合 | `国航 A350` / `南航 77W` / `春秋 A320` |
| 高级筛选 | 顶部「所有地区」+「所有类别」下拉 |

支持 URL 直链：
- `?q=B-2445` — 直接打开搜索结果
- `?reg=B-2445` — 等价

## 数据来源

| 字段 | 来源 |
| --- | --- |
| 注册号 / ICAO24 / 机型代码 / 运营人 ICAO / 序列号 / 出厂年 | [OpenSky Network](https://opensky-network.org/) 月度公开飞机数据库（CC-BY-NC） |
| 航司中文名 / 简称 / IATA 代码 | 本仓库 [`data/operators.json`](data/operators.json) 手工维护 |
| 机型中文名 / 类别 | 本仓库 [`data/aircraft_types.json`](data/aircraft_types.json) 基于 ICAO Doc 8643 |
| 典型客舱布局（F/C/W/Y） | 本仓库 [`data/cabin_layouts.json`](data/cabin_layouts.json) 基于公开座位图人工整理 |

> ⚠️ **关于客舱布局**：同一航司同一机型常有 2~3 种配置（如国航 738 既有 8C+147Y 又有 8C+150Y）。本工具显示的是 **典型布局**，并非每架飞机的实际座椅图。需要精确座位图请查航司官网或 SeatGuru。
>
> 参考站点：[民航休闲小站](http://www.xmyzl.com/?mod=jidui)（机队动态资讯）。

## 本地运行

```bash
# 准备数据（首次需要联网下载 ~100MB CSV）
python scripts/fetch_opensky.py
python scripts/build_data.py

# 启动本地服务
cd public
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 自动更新

`.github/workflows/deploy.yml` 配置了：

- **每月 5 日** 自动从 OpenSky 拉取最新数据，重建 `aircraft.json` 并提交。
- **每次 push 到 main** 自动重新部署到 GitHub Pages。

## 维护：怎么补数据？

- 新航司：编辑 `data/operators.json`，往 `by_icao` 或 `by_owner_keyword` 加一条。
- 新机型：编辑 `data/aircraft_types.json`。
- 新客舱：编辑 `data/cabin_layouts.json` 的 `by_operator_type`，键格式 `<航司ICAO>:<typecode>`，如 `CCA:B789`。
- 改完 `python scripts/build_data.py` 重建即可。

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
│   ├── operators.json      # 航司 ICAO/owner 关键词 → 中文名映射
│   ├── aircraft_types.json # ICAO typecode → 中英机型名 / 类别
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
