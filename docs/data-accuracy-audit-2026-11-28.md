# 机型、注册号与座位图准确性核查

2026-11-28 · 核查基线为 `main` 的 `f25a574`，发布快照含 55,769 条飞机记录。线上发布资产与该提交一致。[基线提交](https://github.com/NightLemon/cn-aircraft-finder/commit/f25a57492d93a08ff13590baaf0a6abf18a912a7) · [Pages 部署记录](https://github.com/NightLemon/cn-aircraft-finder/actions/runs/44800861203)

| 用户会遇到的问题 | 核查结果 |
| --- | --- |
| 输入注册号，查到上一架飞机 | 美国 FAA 历史登记确认 93 条旧机身的号码已重新分配。`N310NW` 现为 DJI AGRAS T50，页面仍显示原达美 A320 和 157 座 |
| 输入注册号，机型与客舱一起查错 | `N37536` 是 737 MAX 9，页面显示 MAX 8 并套用 166 座。`N228WN` 被首条脏记录覆盖，页面误标注销 |
| 筛选机型或地区漏飞机 | 715 条 E175 缺机型映射。澳门登记册的 25 架均可按注册号找到，12 架被归入“中国大陆” |
| 点“真实座位图”找不到图 | 有 14 个航司地址实测返回 404，关联 5,377 条记录。有页面且读到布局的样本中，拼出的机型锚点均未匹配。另有已确认的配置缺失和容量错误，例如捷蓝 A220-300 和美国航空 CRJ-900 |

## 校正与部署数据

本页下方保留了校正前的核查证据。更新后的构建仍使用 OpenSky 公开目录中最新的 2025-08 CSV，并换用 11-23 的 tar1090 数据，加入 11-27 FAA 登记核验和 11-28 澳门民航局在册机型。三份日期各自随数据和构建记录保留。[OpenSky 源目录](https://s3.opensky-network.org/data-samples/?prefix=metadata%2F) · [tar1090 源版本](https://github.com/wiedehopf/tar1090-db/commit/8f870d3cf3e7802d24e70f2f6fb8f91e2a7b12f4)

- 新快照有 **57,148 条**。包含 85 条有有效新登记证的复用号码、1,610 条序列号核实的历史注销，以及 25 架按澳门名册归类的飞机。FAA 更正和逐架更正分别以序列号和六位地址为条件。[FAA 更正表](../data/faa_corrections.json) · [澳门及逐架更正](../data/airframe_corrections.json)
- 同号冲突的 402 条记录及机型存在分歧的 118 条记录暂缓匹配客舱。照片的注册号及可识别机型须与卡片相符才用于推断航司。已确认的货机显示货运布局。
- 校正 E175、A220、山河 Aurora 等型号及相关航司归属。更新美国航空 CRJ-900、捷蓝 A220-300 和澳门航空 neo 系列。座位图采用具体构型的已核实链接，深航 A320neo 的三张图可直接打开。[座位图目录](../data/seat_maps.json)

## 校正前的数据来源与构建复核

项目通过 OpenSky 和 tar1090 补齐飞机清单，用手工字典解释机型、航司和客舱。照片是页面打开后的实时补充。追踪和照片库链接只用于跳转。

| 数据源 | 项目怎么用 | 本次复核 |
| --- | --- | --- |
| OpenSky 飞机元数据 | 注册号、地址、机型、登记人、日期。按公开桶的最新文件名选快照 | 列表完整，共 35 份符合命名的 CSV，最新为 2025-08，609,254 条。OpenSky 将监管登记、第三方资料和众包汇总，数据页明确提示已过时。[项目下载器](../scripts/fetch_opensky.py) · [OpenSky 数据说明](https://opensky-network.org/data/aircraft) · [原始 CSV](https://s3.opensky-network.org/data-samples/metadata/aircraft-database-complete-2025-08.csv) |
| tar1090-db / Mictronics | 补充飞机。地址或号码任一在库就作为“活跃”信号 | 还原 11-05 构建所用的 11-02 CSV，共 623,847 条，11-23 版有 648,372 条。两者都是飞机元数据库，数据中没有末次接收时间。[上游项目](https://github.com/wiedehopf/tar1090-db) · [11-02 源版本](https://github.com/wiedehopf/tar1090-db/commit/512e1802380e7fb131ac2dec47e910ea91dd652b) · [11-23 源版本](https://github.com/wiedehopf/tar1090-db/commit/8f870d3cf3e7802d24e70f2f6fb8f91e2a7b12f4) |
| 本地机型与航司字典 | 把设计器和航司代码映射为中英文名、类别、搜索字段 | 对照 FAA 公开的飞行计划机型设计器及航司代码表。另用 FAA 注册下载和澳门登记册定位具体机身。[机型字典](../data/aircraft_types.json) · [航司字典](../data/operators.json) · [机型设计器](https://www.faa.gov/documentLibrary/media/Order/FAA_Order_JO_7360.1K_Aircraft_Type_Designators.pdf) · [航司代码](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html) |
| 本地客舱表与 AeroLOPA | 先查航司和机型，再查机型通用参考。AeroLOPA 链接由前端单独拼接 | 核验全部 647 条航司配置与 27 条通用配置，能解析分舱数字的记录均可加回表中总数。用 AeroLOPA 作容量和链接初筛，用航司、制造商及具体版本页面复核。[客舱表](../data/cabin_layouts.json) · [上次座位图核查](cabin-layout-audit.md) · [AeroLOPA 航司目录](https://www.aerolopa.com/airlines) |
| Planespotters 照片 API | 按注册号取第一张照片，从 URL 中的航司名补全卡片和客舱 | 抽取 8 个真实响应，用原页面逻辑重放，复现旧照片或不同机型照片传导到卡片。API 返回的图片可用作照片来源，机身和运营人仍需核对。[公开 API](https://www.planespotters.net/photo/api) |
| Flightradar24、ADS-B Exchange、JetPhotos、Daisycon | 用注册号或 ICAO24 拼追踪和照片库链接，用航司代码取徽标 | 代码检查确认这些接口不回写机型、注册号或客舱。所传标识错误时，链接可指向不同飞机。[页面链接代码](../public/app.js#L192) · [Flightradar24 对错误和覆盖的说明](https://www.flightradar24.com/blog/inside-flightradar24/common-errors-on-flightradar24/) · [ADS-B Exchange 地图说明](https://support.adsbexchange.com/hc/en-us/articles/44653064937741-Map-Help) |

用相同两份 CSV 和 Actions 的 `pypinyin 0.55.0` 重跑构建，重现 20,527 条补充记录及全部 55,769 条发布记录。行式文件、列式文件和客舱查询表逐字节相同，元数据统计逐项相同。问题主要发生在来源选取、身份合并、代码解释及链接生成。[11-05 构建记录](https://github.com/NightLemon/cn-aircraft-finder/actions/runs/42018115801) · [构建入口](../scripts/build_data.py)

同一号码和 ICAO24 可以在两个源中同时出现，并产生不同机型标签。原始两源中有 480 条发布记录存在这种非空机型代码差异，其中 253 条的站内代码与同号同地址的 tar1090 非空代码有异。另有 340 条站内机型为空，tar1090 同号同地址提供了可核查的候选。两源同时给出相同代码也需要核对具体型号，例如它们都把 `N37536` 写成 `B38M`。

## 注册号、地址与机身

构建器按注册号保留首个合格的 OpenSky 行。遇到重复号码时，后面的有效记录可能被丢弃。11-02 的 tar1090 对 51,484 条发布记录至少命中一个键，其中 312 条具备六位 ICAO24，只有单键或非精确组合命中。它们仍会得到命中信号。登记日期也直接被前端写成“服役”，登记到期则被写成“已注销”或“退役”。这几个状态需要分别取证。[构建选行与活动规则](../scripts/build_data.py#L347) · [卡片日期](../public/app.js#L473) · [FAA 登记状态定义](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/registration_status)

| 全量检查 | 数量与复现 |
| --- | --- |
| 不同字符串对应同一个搜索注册号 | 5 组、10 条。`B-32C2` 与 `B32-C2` 的地址均为 `781e3d`，输入任一格式同时呈现两张卡 |
| 规范化后号码相同、机型和地址不同 | `B-227W` / `B227W` 同时来自 11-02 和 11-23 的 tar1090。两条分别为 MAX 8（`7820fc`）和 777（`782320`）。近期可见涂装和注册号的原照记录了中州航空 777F。两条需要按机身区分。[原照](https://www.airhistory.net/photo/884580/B-227W) |
| 同一六位 ICAO24 对应两个发布号码 | 97 组、194 条。包含格式别名、临时号或历史记录等，需结合机身和日期判定 |
| 形如日期的注册号 | 9 条，例如 `1997-08-29` 的瑞士 A319。原字段直接进入搜索 |
| 非六位十六进制地址 | 5 条。包括 `N228WN` 的 `a200b` 和 `N3123J` 的 `a3510`。两例都能在同一份 OpenSky CSV 后面的行及 tar1090 找到完整地址 |
| 号段提示与机型大类冲突 | 对 6,158 条能按页面规则比较的记录，2,693 条类别不同。输入 README 的示例 `B-2445` 会同时看到波音 747-400 和“窄体客机（早期）”。登记规定定义的是标志格式，当前提示无法用于机型识别。[现行登记规定](https://www.caac.gov.cn/XXGK/XXGK/MHGZ/202201/t20220125_211271.html) · [国航 747-400](https://www.airchina.us/US/CN/info/aircraft-introduction/boeing747.html) |

### 美国与澳门的登记对照

美国部分按 FAA N-number 格式选出 20,961 个不同注册号，其中 4,634 条在站内的非 `us` 地区。该地区字段可由航司表决定，直接筛选 `us` 会漏掉公务机、外国航司等名下的美国注册号。以 FAA 下载包中 `MASTER.txt` 的 N-number 为键，补前缀 `N` 后作精确关联，再用 `MFR MDL CODE → ACFTREF.CODE` 取制造商及型号。用同号及序列匹配 `DEREG.txt` 历史记录。ICAO24 忽略大小写，不填补缺位。序列号去分隔符，纯数字去前导零。[FAA N-number 格式](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/forming_nnumber) · [FAA 下载字段定义](https://registry.faa.gov/database/ardata.pdf)

| 核对项 | 结果 |
| --- | --- |
| 20,961 条有合规 N-number 格式的站内行 | 13,185 条命中 FAA `MASTER`，全部可关联 `ACFTREF`。7,776 条未命中 |
| 13,185 条同号记录的 ICAO24 | 13,173 一致，12 不一致 |
| 13,185 条同号记录的序列号 | 9,020 一致，3,975 缺可比值，190 不一致 |
| 190 条序列冲突 | 全部同 N-number、同 ICAO24。93 条在 FAA `DEREG` 中还能查到站内的同号、同序列旧机身 |
| 7,776 条当前主表未命中 | 1,602 条在 `DEREG` 同号同序列，其中 1,151 条站内仍标“在役”。其余 6,174 条缺少这种历史匹配 |
| `A319/A320/A321` 和新版 737 的可明确映射子集 | 2,937 条同时满足 FAA 状态 `V`、同 N-number、同 ICAO24、同序列和选定型号映射。2,821 个设计器一致，114 个为空，2 个冲突 |
| A220、宽体、CRJ 和部分 ERJ 等另外 26 种设计器 | 用同一匹配门槛，仅采用可明确映射的制造商具体型号。2,345 条中 2,331 条一致，13 条为空，1 条冲突 |

FAA ZIP 的 HTTP Last-Modified 为 2026-11-27 05:58:32 UTC，73,203,960 字节，SHA-256 为 `2956BF6E7698BA181D1C3B1FDFB126B7C718C1E3F0F5462FA9520F81BBD427A2`，各成员通过 CRC。用于关联的主表有 319,586 个不同 N-number，型号表有 94,241 个代码，历史表在全库有 383,846 条带 N-number 的记录。FAA 每日刷新公开下载，可用校验值固定这次对照。[FAA 官方 ZIP](https://registry.faa.gov/database/ReleasableAircraft.zip) · [FAA 下载更新说明](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download)

| 注册号 | 站内显示 | FAA 核验 |
| --- | --- | --- |
| [N310NW](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=310NW) | Delta A320-211，序列 121，在役，157 座。ICAO24 `a34812` | 旧 A320 于 2018-09-27 注销。同号同地址的 DJI AGRAS T50 于 2025-01-02 已获登记证，早于项目 2025-08 OpenSky 基线，序列 `1581F6BUB235H0010027` |
| [N105UA](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=105UA) | United 747-451，序列 26473，在役，372 座典型模板。ICAO24 `a0190a` | 旧 747 于 2018-03-08 注销。当前同号同地址是 Hughes 369A (OH-6A)，序列 880723 |
| [N228WN](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=228WN) | Algeria，2025-06-30 已注销，地址 `a200b`，序列 32496 | 同序列 737-7H4 登记状态为 Valid，地址 `A200BA`。干净行在同一份 OpenSky CSV 中排在后面，tar1090 也有完整地址和 `B737` |
| [N37536](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=37536) | `model=737-9`，设计器 `B38M`，页面显示 MAX 8 并载入 `UAL:B38M` 的 166 座模板 | 同序列 66606、同地址。型号 737-9 对应 `B39M`。OpenSky 与 tar1090 都没有给对代码 |
| [N8713M](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=8713M) | `model=737-8`，设计器 `B38M`，页面显示 MAX 8 并载入 `SWA:B38M` 的 175 座模板 | 同序列 36984、同地址。FAA 型号 737-800 对应 `B738`。两套客舱模板的总数碰巧都是 175 |
| [N920FD](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=920FD) | OpenSky 行把 Boeing 757-23A 的设计器写成 `CL35`。站内机型分类和客舱无法按 757 匹配 | FAA 对应 757-23A、序列 24289，设计器为 `B752`。tar1090 同号同地址也有 `B752` |

FAA 的民用 ICAO24 可由 N-number 计算。注册号分给下一架飞机后，两种标识仍可能都对得上。要判定是同一机身，还需核对制造商、序列号或登记有效期。登记人可为信托和出租人，当前商业运营人应另行取证。[FAA 24 位地址编码说明](https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_20-165B.pdf) · [FAA 登记数据字段](https://registry.faa.gov/database/ardata.pdf)

澳门民航局清单共 25 架，与站内按照注册号精确匹配均有记录，机型系列全部对应。23 架列于澳门航空名下，其中 12 架在静态数据里没有运营人。12 架官方在册飞机被站点分到“中国大陆”，含 11 架澳门航空客机及 1 架 AW139。例 `B-MCK` 和 `B-MBT` 的 OpenSky 原字段均为 `country=China`、运营人空值，现有构建优先保留 OpenSky，因而没有使用补充流程中的 `B-M` 地区规则。站内另有 10 条 `B-M` 号码未出现在当前名册，可用于追查登记变化。[澳门民航局在册飞机](https://www.aacm.gov.mo/en/industry-page/RegisteredAircraft) · [澳门首架 A320neo 验收](https://www.aacm.gov.mo/en/about/media-center/news/201904/680ab75953ce46cfb34951a4ac63b3bb)

中国大陆和香港的公开登记页面提供规则或办理服务，台湾公开页提供机型架数。逐注册号的官方批量关联采用美国和澳门的可下载或可枚举名册。[中国民航局登记规定](https://www.caac.gov.cn/XXGK/XXGK/MHGZ/202201/t20220125_211271.html) · [香港民航处登记](https://www.cad.gov.hk/english/planereg.html) · [台湾机型架数](https://www.caa.gov.tw/article.aspx?a=1735&lang=1)

## 机型与航司代码

快照中有 5,559 条缺 `type`，其中 765 条仍有原始型号。另有 5,166 条带代码但不在本站词典中，至少 4,947 条记录的代码能在 FAA 型号表定位。它们在页面上用原始型号或代码代替标准名称，统一归到 `other`。也有设计器存在、下游把某个型号写死的情况。[机型解析](../scripts/build_data.py#L239) · [FAA 型号表](https://www.faa.gov/documentLibrary/media/Order/FAA_Order_JO_7360.1K_Aircraft_Type_Designators.pdf)

| 代码 | 已核实的问题 |
| --- | --- |
| `E75L` / `E75S` | 分别为 E175 长翼和短翼，站内有 670、45 条。词典只配了未被使用的 `E175`，715 条都不进支线分类，也不匹配 E175 客舱。按现有航司字段有 453 条可关联已有 E175 模板，具体执飞方和版本仍需核实 |
| `AURA` / `ECHO` | `AURA` 是山河 SA60/SA70 Aurora，Tecnam P92 Echo 对应 `ECHO`。137 条 `AURA` 均显示 Tecnam P92，其中 104 条原始型号已写明 Sunward。[制造商 SA60L](https://www.sunward.com.cn/jtdt/114.html) |
| `BCS1` / `BCS3` | 分别为 A220-100 / -300，词典缺两项，涉及 63、330 条。原始型号如 `BD-500-1A11` 可进一步映射为 A220-300。两者座位数不同 |
| `GL5T` | 同一设计器覆盖 Global 5000 和 5500。35 条均以 5000 为主展示名，至少 9 条原始型号明确写 5500 |
| `AJ27`、`C909` | 228 条使用 `AJ27`。C909 是 ARJ21 的商业名，单独的 `C909` 键没有命中，按 C909 检索也会漏掉只写 ARJ21 的行。[中国商飞命名公告](https://m.comac.cc/xw/202411/12/t20241112_7395972.html) |

航司词典的 256 个有效键中，249 个在 FAA 航司表有同码条目。同码名称仍有错配，下表列的是能直接确认的冲突。表内数字是使用该码的发布条数，逐架修复时还须用原始运营人或登记证据核对。由于客舱和座位图都会使用航司代码，这些映射会误导结果。[FAA 航司识别码](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html) · [FlyArystan 航司代码公告](https://go.flyarystan.com/tpost/3x6slz8bb1-flyarystan-announces-new-iata-code-fs-fo) · [Air Japan 执飞说明](https://www.air-japan.co.jp/en/operated-flight/)

| 站内代码及名称 | 代码表对应公司 | 发布条数 |
| --- | --- | ---: |
| `GDC` 多彩贵州航空 | Grand China Air，大新华航空。多彩贵州航空使用 `CGZ` | 13 |
| `FLZ` FlyArystan | 坦桑尼亚 Flightlink。FlyArystan 使用 `AYN` | 16 |
| `AUL` Pobeda | 俄罗斯 Smartavia。Pobeda 使用 `PBD` | 48 |
| `TPU` Sky Airline | 秘鲁 Trans American / TACA Perú。Sky Airline Perú 使用 `SKX` | 37 |
| `SNJ` Skymark | 日本 Solaseed Air | 42 |
| `AJX` ANA Cargo | 日本 Air Japan | 12 |
| `CTJ` 天骄航空 | 天津货运航空 | 2 |
| `HYT` 幸福航空 | 圆通航空 | 1 |

## 客舱与真实座位图

### 配置正确性

| 对象 | 核验结果 |
| --- | --- |
| 深航 A320neo | 发布表中仍为 174Y，并列出经核实的 152 座和 158 座版本。快照的静态行里没有 `CSZ:A20N`，该配置已用 `B-300N` 的真实 API 响应重放，页面在识别出深航后显示 174Y 和其他版本备注。[174 座](https://www.aerolopa.com/zh-32n-3) · [152 座](https://www.aerolopa.com/zh-32n-2) · [158 座](https://www.aerolopa.com/zh-32n-1) |
| 美国航空 CRJ-900 | 93 条 `AAL:CRJ9` 命中 65 座。PSA 的 CRJ-900 机队与其专属座位图为 76 座，65 座是其 CRJ-700 版本。[PSA 机队](https://psaairlines.com/fleet/) · [CRJ-900 座位图](https://www.aerolopa.com/aa-cr9) |
| 捷蓝 A220-300 | 70 条 `JBU:BCS3` 缺航司客舱。捷蓝公开 140 座，机型字典也缺 `BCS3`。[捷蓝座位规格](https://www.jetblue.com/help/seats) · [座位图](https://www.aerolopa.com/b6-220) |
| 澳门航空 A320neo / A321neo | `AMU:A20N`、`AMU:A21N` 均缺。首架 A320neo 交付为 8 公务 + 150 经济。A321neo 有 12 公务 + 186 经济的座位图。遇到澳门航空登记客机同时缺运营人时，两项问题叠加。[空客交付说明](https://www.airbus.com/en/newsroom/press-releases/2019-04-air-macau-presents-its-first-a320neo) · [A321neo 座位图](https://www.aerolopa.com/nx-32q) |
| 南航 A330-300、约旦皇家 A320neo | 独立座位图的容量差异需结合版本。南航官网有 283 座 33C，站内值有依据。约旦皇家同时列出 180 座和 150 座，站内 180 座有依据，版本备注可以补全。[南航 33C](https://www.csair.com/sg/en/tourguide/flight_service/cabin_layout/kongke/1cok4th40ctjs.shtml) · [约旦皇家 A320neo](https://www.rj.com/en/fly-rj/our-fleet/A320neo) |

合计 21 条专属配置使用了机型词典未定义的键。其中特殊运营布局标识（如 `CPA:B77G`）未匹配到任何登记记录。也有 `DAL:BCS1` 这类**已被实际快照命中**的有效 ICAO 键，只是缺少展示词典。15,601 条记录带机型通用客舱，其中 13,491 条带数值总容量。用户看到的是机型参考。

### 真实座位图入口与照片

当前按钮使用 `/<IATA>#<ICAO机型>`。AeroLOPA 按机队与版本组织，深航的 A320neo 在 `/zh-32n-1` 等页面。当按钮为 `/zh#A20N` 时会进航司目录，页面没有 `A20N` 锚点。

- 静态数据有 37,720 条带 IATA，可生成座位图入口。对能够解析机型布局的航司页面，26,705 条同时带机型的记录都没有可匹配的 HTML 锚点。
- 在项目代码覆盖的 IATA 中，79 个未出现在 AeroLOPA 航司目录。抽取按飞机数排名的前 15 个验证直链，14 个返回 404。这 14 个覆盖 5,377 条记录，包括 `/1i`、`/oo`、`/fx`。目录之外的地址仍可能有跳转或后续上线。[航司目录](https://www.aerolopa.com/airlines) · [链接生成代码](../public/app.js#L192)
- 按航司 IATA、机型名称和公开图的容量初筛，有 446 条专属配置进入比较，其中 407 条至少与一个版本同总数，39 条容量不同。初筛会遇到同品牌不同执飞方、历史布局和同码子型，见附表。总数相同的配置还可能存在分舱差异。

使用 8 个真实 API 响应重放卡片。`B-2445` 和 `B-32C2` 的照片标签与页面机型一致。下表列出照片补全影响的字段。

| 注册号 | API 与页面组合后的结果 |
| --- | --- |
| `B-227W` | 返回照片是中州航空 777F。页面从照片补为中州航空，接着将其与原行中的 MAX 8 组合，显示 170 座客机参考布局。[原 API 照片](https://www.planespotters.net/photo/2007773/b-227w-central-airlines-boeing-777-f1h) |
| `B-30FP` | 两份上游都将地址 `781973` 标为 A321neo。照片与追踪页均标为深航 A320-271N，飞机档案列出 `781973`。页面补到深航后却按 A321neo 显示 184 座。[照片](https://www.planespotters.net/photo/1886988/b-30fp-shenzhen-airlines-airbus-a320-271n) · [飞机档案](https://www.planespotters.net/airframe/airbus-a320neo-b-30fp-shenzhen-airlines/e5o60g) · [追踪页](https://www.flightradar24.com/data/aircraft/b-30fp) |
| `B-000A` | 返回照片标签为国航 A321neo。页面保留发布数据的 A320neo 机型，并补成国航 158 座。注册号和照片中的机型需要先校验。[原 API 照片](https://www.planespotters.net/photo/2000922/b-000a-air-china-airbus-a321-252nx) |
| `N310NW` | API 仍返回旧达美 A320 的照片，页面也继续展示旧客舱。该 N-number 已重新分配。[历史照片](https://www.planespotters.net/photo/292684/n310nw-delta-air-lines-airbus-a320-211) · [FAA 登记](https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?NNumberTxt=310NW) |
| `B-MCK` | 照片补出澳门航空，原有地区仍为“中国大陆”。客舱查找缺少澳门航空 A320neo，因此显示待核实。[原 API 照片](https://www.planespotters.net/photo/2000125/b-mck-air-macau-airbus-a320-271n) |

照片补全直接使用返回的第一张，规则没有检查机型或拍摄时间。已知的站内航司也会阻止照片补全逻辑重新判断。该结果只在卡片 DOM 生效，地区和航司搜索仍使用发布表。[照片匹配代码](../public/app.js#L302)

## 修复优先级

| 优先级 | 对应结果 | 验收方法 |
| --- | --- | --- |
| 第一 | 先把注册号、地址与当前机身校验放在合并之前。遇到冲突时保留历史或提示待核实，避免把旧机身的照片、活动和客舱拼到现行注册号上 | 用 FAA 当前和历史记录重放 `N310NW`、`N228WN`、`N37536`。同地址格式别名例 `B-32C2` 应只有一张主卡。不同地址的 `B-227W` 冲突应可见 |
| 第二 | 补全标准机型、纠正航司代码和澳门地区归属。对有记录但两源冲突的具体型号以登记及制造商资料核实 | E175 搜索及支线筛选能覆盖长、短翼。山河 Aurora 显示品牌正确，澳门 25 架在册机按官方归类 |
| 第三 | 核实航司与机型后，再补客舱版本和能打开的座位图链接。只有航司目录时明确标注入口类型 | 回归深航三套链接，核实美国航空 CRJ-900、捷蓝 A220 和澳门航空配置。客货共码的具体座位图按运营实际匹配 |

核查边界包括美国和澳门的逐机登记、全部发布记录与两份构建源的关联、所有客舱键的内部一致性，以及有公开图的覆盖和差异筛查。实际航班使用的具体座位版本仍由当班选座图确认。

## 复核基线

- OpenSky 2025-08 CSV 为 107,956,517 字节，SHA-256 为 `41309cab2a092afc90304631532b3b9a7ce1e501ba003d9590c2ab84208daa3c`。完整桶目录未分页。[目录](https://s3.opensky-network.org/data-samples/?prefix=metadata/)
- 还原 tar1090 使用 2026-11-02 的 `csv` 提交 `512e1802`。压缩文件 SHA-256 为 `7516778c73c4165099115d2aa1553d845cec7f43e3815b61e9f016151e87b8ea`。该分支持续改写最新 CSV，按提交固定源文件。[原始压缩文件](https://github.com/wiedehopf/tar1090-db/raw/512e1802380e7fb131ac2dec47e910ea91dd652b/aircraft.csv.gz) · [上游更新脚本](https://github.com/wiedehopf/tar1090-db/blob/512e1802380e7fb131ac2dec47e910ea91dd652b/csv.sh)
- 用项目的正常构建入口重建，并对已有快照做独立交叉检查。对照源表、三个发布数据文件及元数据，查看站点首选的列式路径和照片 API 返回后的实际 DOM。[回归测试](../tests/test_cabin_layouts.py)

<details>
<summary>39 条容量初筛差异</summary>

同一航司机型可有多张座位图。下表保留初筛容量差异，已经核实的结论放在最后一列。待核实项仍需匹配实际运营人、版本和日期。

| 航司与机型 | 项目容量 | AeroLOPA 初筛容量 | 证据与进展 |
| --- | ---: | --- | --- |
| `CSN:A333` | 283 | [275](https://www.aerolopa.com/cz-33c)、[286](https://www.aerolopa.com/cz-33w) | 南航官网有 283 座的 33C。[航司配置](https://www.csair.com/sg/en/tourguide/flight_service/cabin_layout/kongke/1cok4th40ctjs.shtml) |
| `CHH:B738` | 164 | [170](https://www.aerolopa.com/hu-738-2) | 待核实适用版本 |
| `CHH:A332` | 214 | [222](https://www.aerolopa.com/hu-332-1)、[260](https://www.aerolopa.com/hu-332-2) | 待核实适用版本 |
| `CXA:B737` | 128 | [126](https://www.aerolopa.com/mf-73g) | 待核实适用版本 |
| `CSC:A320` | 158 | [180](https://www.aerolopa.com/3u-320-2)、[164](https://www.aerolopa.com/3u-320) | 待核实适用版本 |
| `GCR:E190` | 98 | [106](https://www.aerolopa.com/gs-e90) | 待核实适用版本 |
| `LKE:B738` | 164 | [186](https://www.aerolopa.com/8l-738-1)、[189](https://www.aerolopa.com/8l-738-2) | 待核实适用版本 |
| `AAL:CRJ9` | 65 | [76](https://www.aerolopa.com/aa-cr9-2)、[76](https://www.aerolopa.com/aa-cr9) | PSA 官网确认 76 座。站内 65 座与 CRJ-700 混用。[执飞航司机队](https://psaairlines.com/fleet/) |
| `NKS:A320` | 176 | [182](https://www.aerolopa.com/nk-32a) | Spirit 2024 年报机队披露为 176 座，图档给出不同数字，原因仍待核实。[2024 年报](https://ir.spirit.com/files/doc_financials/2024/q4/SAVE-2024-12-31-24-10K.pdf) |
| `NKS:A20N` | 176 | [182](https://www.aerolopa.com/nk-32n) | Spirit 2024 年报机队披露为 176 座。[2024 年报](https://ir.spirit.com/files/doc_financials/2024/q4/SAVE-2024-12-31-24-10K.pdf) |
| `NKS:A321` | 222 | [228](https://www.aerolopa.com/nk-32b-1)、[228](https://www.aerolopa.com/nk-32b-2) | Spirit 2024 年报机队披露为 222 座。[2024 年报](https://ir.spirit.com/files/doc_financials/2024/q4/SAVE-2024-12-31-24-10K.pdf) |
| `NKS:A21N` | 229 | [235](https://www.aerolopa.com/nk-32q) | Spirit 2024 年报机队披露为 229 座。[2024 年报](https://ir.spirit.com/files/doc_financials/2024/q4/SAVE-2024-12-31-24-10K.pdf) |
| `DLH:A346` | 293 | [281](https://www.aerolopa.com/lh-346-1) | 待核实适用版本 |
| `IBE:A319` | 141 | [122](https://www.aerolopa.com/ib-319-1) | 待核实适用版本 |
| `SAS:A333` | 262 | [270](https://www.aerolopa.com/sk-333)、[270](https://www.aerolopa.com/sk-333-2) | 航司确认有 262 座交付构型。[SAS 交付公告](https://www.sasgroup.net/newsroom/press-releases/2015/sas-first-in-europe-to-fly-the-new-airbus-a330-300-enhanced/) |
| `TAP:A321` | 216 | [171](https://www.aerolopa.com/tp-32q-lr) | 对照图为 A321LR，与 A321ceo 分开。[A321ceo 座位图](https://www.aerolopa.com/tp-321) |
| `TCX:B788` | 291 | [300](https://www.aerolopa.com/by-788-1)、[305](https://www.aerolopa.com/or-788) | 待核实适用版本 |
| `EWG:A20N` | 180 | [170](https://www.aerolopa.com/ew-32n-2) | 待核实适用版本 |
| `TWB:A321` | 200 | [195](https://www.aerolopa.com/bx-321-1)、[220](https://www.aerolopa.com/bx-321-2)、[220](https://www.aerolopa.com/bx-32q-2) | 待核实适用版本 |
| `MAS:B738` | 160 | [174](https://www.aerolopa.com/mh-738-1) | 待核实适用版本 |
| `TGW:B789` | 375 | [378](https://www.aerolopa.com/tr-789) | 酷航公开 PDF 有 375 座。[酷航座位图](https://cdn.flyscoot.com/prod/docs/default-source/doc-our-fleet/b787_seat_map.pdf) |
| `PAL:A320` | 156 | [180](https://www.aerolopa.com/pr-320) | 待核实适用版本 |
| `HVN:A321` | 184 | [185](https://www.aerolopa.com/vn-321-1)、[179](https://www.aerolopa.com/vn-321-2)、[203](https://www.aerolopa.com/vn-321-3) | 待核实适用版本 |
| `HVN:A20N` | 186 | [184](https://www.aerolopa.com/vn-32n) | 越航容量页列出 186 个座椅，舱位安排随国内线和国际线变化。[航司容量](https://www.vietnamairlines.com/vn/en/vietnam-airlines/our-fleets/Airbus-a320-neo) |
| `AIC:B77W` | 342 | [347](https://www.aerolopa.com/ai-77w-1)、[328](https://www.aerolopa.com/ai-77w-2) | 待核实适用版本 |
| `QFA:A333` | 297 | [301](https://www.aerolopa.com/qf-333)、[279](https://www.aerolopa.com/ay-333?operator=QF) | 待核实适用版本 |
| `JST:A320` | 180 | [186](https://www.aerolopa.com/jq-320-1) | 待核实适用版本 |
| `ACA:A319` | 120 | [136](https://www.aerolopa.com/rv-319) | 对照图属于 Air Canada Rouge。 |
| `AVA:A319` | 144 | [150](https://www.aerolopa.com/av-319) | 航司机队页列出最多 144 座，仍需对应布局版本。[Avianca 机队](https://www.avianca.com/en/about-us/our-fleet/) |
| `AVA:A320` | 180 | [186](https://www.aerolopa.com/av-320) | 待核实适用版本 |
| `LAN:A21N` | 224 | [174](https://www.aerolopa.com/la-32q-2) | 174 座为宣布将于 2027 年加入的 A321XLR。A321neo 系列须按子型和交付时间区分。[LATAM 公告](https://www.latamairlines.com/us/en/press-room/releases/latam-unveils-new-long-haul-experience-aboard-its-airbus-a321xlr) |
| `GLO:B738` | 186 | [176](https://www.aerolopa.com/g3-738) | 待核实适用版本 |
| `GLO:B38M` | 186 | [176](https://www.aerolopa.com/g3-7m8) | 待核实适用版本 |
| `ETH:B77W` | 348 | [361](https://www.aerolopa.com/et-77w-2)、[393](https://www.aerolopa.com/et-77w-1) | 待核实适用版本 |
| `AMX:E190` | 100 | [99](https://www.aerolopa.com/am-e90) | 待核实适用版本 |
| `AZA:A21N` | 180 | [165](https://www.aerolopa.com/az-32q) | 待核实适用版本 |
| `LAN:B763` | 231 | [233](https://www.aerolopa.com/la-763-1) | 待核实适用版本 |
| `LAN:B789` | 313 | [307](https://www.aerolopa.com/la-789-1)、[303](https://www.aerolopa.com/la-789-2)、[303](https://www.aerolopa.com/la-789-3) | 待核实适用版本 |
| `RJA:A20N` | 180 | [150](https://www.aerolopa.com/rj-32n-2) | 航司同时列出 150 座和 180 座。[航司机队](https://www.rj.com/en/fly-rj/our-fleet/A320neo) |

</details>
