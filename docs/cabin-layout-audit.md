# 客舱布局核查记录

核查日期为 2026-11-21。以提交 [`5784748`](https://github.com/NightLemon/cn-aircraft-finder/tree/5784748) 为基线，使用项目在 2026-11-05 生成的 55,769 架飞机快照，其中 OpenSky 源文件月份为 2025-08。本文的座位数对应具体客舱版本。航班换机或飞机改装后，以航司当班选座图为准。

## 深航 A320neo 的 174 座从哪里来

[Issue #1](https://github.com/NightLemon/cn-aircraft-finder/issues/1) 提供了航司机型键 `CSZ:A20N` 和 `174Y`，未指定注册号。旧表缺少这个键，网站便采用 A320neo 通用值 `8C + 174Y`，共 182 座。深航的座位图可以核实三种构型。

| 版本 | 公务舱 | 经济舱 | 总座数 | 座位图 |
| --- | ---: | ---: | ---: | --- |
| 32N-3 | 0 | 174 | 174 | [全经济舱](https://www.aerolopa.com/zh-32n-3) |
| 32N-2 | 8 | 144 | 152 | [152 座双舱](https://www.aerolopa.com/zh-32n-2) |
| 32N-1 | 8 | 150 | 158 | [158 座双舱](https://www.aerolopa.com/zh-32n-1) |

卡片采用反馈所指的 174 座版本，另两种列在备注中。源表同时供应飞机行式数据、列式数据以及照片补全航司后查询的布局表。缺少航司配置的 A320neo 显示“航司配置待核实”。

## 如何筛查其他航司机型

将快照内同时有航司代码和机型代码的 2,883 种组合，与原有 576 条专属记录合并、去重，共 2,952 种。逐一检查能否匹配专属布局、通用布局，以及已知分舱数之和是否等于总座数。再用维基百科各航司机队表中可识别的在役机型及总容量筛选差异，最终按航司资料、制造商交付记录或座位图发布者的具体版本核对。

| 原有专属记录的筛查结果 | 条数 | 核查含义 |
| --- | ---: | --- |
| 在公开机队表中至少匹配一种总容量 | 258 | 总数相符的记录仍可能分舱错误，国航 747-400 即为一例 |
| 有可比较容量，原值均不相符 | 157 | 逐项查找具体版本、注册号或所属航司。部分原值有历史座位图依据 |
| 未匹配到可比容量 | 161 | 包含货机和历史机型。单凭缺少机队表数字无法判定原记录对错 |

本次新增 83 条航司机型配置，更新 204 条原记录，其中 185 条调整了布局或总座数，其余 19 条补充或修正版本说明。另移除 12 条挂错航司、机型或自造代码的记录。更新后有 647 条专属记录。55,769 条飞机记录中，10,180 条客舱显示发生变化，含 685 条首次匹配到专属记录。

## 有代表性的修正

| 航司和机型 | 核实结果 | 依据 |
| --- | --- | --- |
| 南航 A320neo | 原表为 182 座。32E 实为 166 座，国内线列 4 公务、24 明珠经济、138 经济。国际线同一机型列 4 公务、162 经济 | [南航 32E 客舱布局](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/1b898hltfgpvq.shtml) |
| 国航 747-400 | 原表总数 344 正确，但额外划出了 30 个超经座位。官网的 344 座版为 10 头等、42 公务、292 经济 | [国航 747-400](https://www.airchina.us/US/CN/info/aircraft-introduction/boeing747.html) |
| 达美 A321neo | 旧分舱合计 190，字段写 194。官网的 194 座版为 20 Delta First、60 Delta Comfort、114 Delta Main，另有 164 座版 | [达美 A321neo](https://www.delta.com/us/en/aircraft/airbus/a321-neo) |
| 澳航 737-800 | 现行资料列有 168 和 162 座。原表的 174 座也有历史座位图，保留在备注中 | [现行机队页](https://www.qantas.com/en-ph/onboard/fleet/737) · [174 座座位图](https://www.qantas.com/infodetail/flying/inTheAir/ourAircraft/738-12J162Y.pdf) |
| 英航 A321neo | 安装 220 个座位，欧洲线公务舱封锁中座。页面显示安装容量和分区规则，实际可售数随隔帘位置变化 | [英航 32Q 座位图](https://www.aerolopa.com/ba-32q-1) |
| 加拿大航空、联邦快递 B77L | ICAO 将 777-200LR 客机和 777F 货机归入同一码。加航的 300 座版和联邦快递货机各用专属记录，通用项显示“客运或货运” | [FAA 机型代码表](https://www.faa.gov/documentLibrary/media/Order/FAA_Order_JO_7360.1K_Aircraft_Type_Designators.pdf) · [加航 777-200LR](https://www.aerolopa.com/ac-77l) |

大连航空的代码为 `CCD`，长龙航空为 `CDC`，山东航空为 `CDG`。逐条对照同一 OpenSky 源文件后，确认有 26 条按所有人名称识别的长龙记录和 10 条大连记录用了旧映射，另有 9 条原始代码为 `CDC` 的长龙记录被显示为山东航空。三家航司的中英文名称、航司查询和机队计数按更正后的代码对应。顺丰的 737-800F 和 767-300F 也从韩亚代码移到了 `CSS`。[FAA 航司代码表](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html) · [IATA 顺丰航空](https://www.iata.org/en/about/members/airline-list/sf-airlines/490/) · [顺丰机型说明](https://www.sf-airlines.com/news/447.html)

## 覆盖范围与仍待确认的记录

更新后，快照与配置表共涉及 76 个 A320neo 航司代码，其中 69 个有专属记录。其余 7 个为 `AIB`、`AUL`、`FLZ`、`GDC`、`LAN`、`TPU`、`TRA`。这些记录涉及试飞机、航司代码与名称对应关系、集团和子公司归属等问题。比如空客明确说明 186 座交付对象为法国 Transavia（`TVF`），荷兰 Transavia（`TRA`）仍使用待核实提示。[空客交付说明](https://www.airbus.com/en/newsroom/press-releases/2024-01-transavia-france-takes-delivery-of-its-first-a320neo)

下表给出本次写入配置的来源。航司只给出容量，或不同座位图对分舱数有冲突时，保留能够核实的部分。例如 flydubai 已确认 737-800 改装，但公开图中经济舱座数不一致，因此该条目只展示公务舱和经济舱。专项核查未覆盖每架飞机的注册号级布局。[flydubai 机队](https://www.flydubai.com/en/help/our-fleet/) · [737-800 座位图](https://www.aerolopa.com/fz-738)

<details>
<summary>查看 157 条容量差异的逐项核查结果</summary>

每项依次列出机型、原表容量、核实后展示的容量。航司代码链接到用于筛查的公开机队表。修改依据在下方的航司资料索引。箭头两端数值相同，表示原容量有版本依据，分舱或说明仍可能需要修正。

| 航司与初筛资料 | 原表座数 → 核实后的座数 |
| --- | --- |
| [AAR](https://en.wikipedia.org/wiki/Asiana_Airlines) | A321 171 → 174 · B772 298 → 300 |
| [ACA](https://en.wikipedia.org/wiki/Air_Canada_fleet) | A320 146 → 146 · A321 183 → 196 · B77L 299 → 300 · B788 251 → 255 |
| [AEE](https://en.wikipedia.org/wiki/Aegean_Airlines) | A320 168 → 174 · A321 210 → 206 |
| [AFR](https://en.wikipedia.org/wiki/Air_France_fleet) | A332 208 → 224 · B772 279 → 328 |
| [AIC](https://en.wikipedia.org/wiki/Air_India_fleet) | A20N 182 → 164 · A21N 186 → 189 · A320 170 → 150 |
| [AMU](https://en.wikipedia.org/wiki/Air_Macau) | A320 152 → 158 · A321 186 → 179 |
| [AMX](https://en.wikipedia.org/wiki/Aerom%C3%A9xico) | B38M 156 → 166 · B738 156 → 160 · B789 277 → 274 |
| [ANA](https://en.wikipedia.org/wiki/All_Nippon_Airways_fleet) | B788 216 → 184 |
| [ANZ](https://en.wikipedia.org/wiki/Air_New_Zealand_fleet) | A320 168 → 171 |
| [ASA](https://en.wikipedia.org/wiki/Alaska_Airlines_fleet) | B738 159 → 159 |
| [AUA](https://en.wikipedia.org/wiki/Austrian_Airlines) | A320 158 → 180 |
| [AVA](https://en.wikipedia.org/wiki/Avianca) | A20N 168 → 180 · A319 120 → 144 · A320 150 → 180 |
| [BAW](https://en.wikipedia.org/wiki/British_Airways_fleet) | A20N 180 → 180 · A21N 212 → 220 · A319 132 → 144 · A320 168 → 180 · B772 264 → 272 · B77W 280 → 256 · B788 214 → 204 |
| [CAL](https://en.wikipedia.org/wiki/China_Airlines) | B738 160 → 158 |
| [CCA](https://en.wikipedia.org/wiki/Air_China) | A332 300 → 237 · A333 211 → 311 · AJ27 78 → 90 · B738 164 → 167 |
| [CDG](https://en.wikipedia.org/wiki/Shandong_Airlines) | B38M 170 → 176 · B737 128 → 135 · B738 164 → 164 |
| [CES](https://en.wikipedia.org/wiki/China_Eastern_Airlines) | A319 128 → 122 · A321 193 → 182 · A333 234 → 300 · B737 128 → 134 · B738 164 → 170 · B789 273 → 285 |
| [CHB](https://en.wikipedia.org/wiki/West_Air_(China)) | A21N 230 → 207 · A320 180 → 180 |
| [CHH](https://en.wikipedia.org/wiki/Hainan_Airlines) | A332 289 → 214 · A333 288 → 292 · A339 277 → 301 · B789 293 → 289 |
| [CMP](https://en.wikipedia.org/wiki/Copa_Airlines) | B38M 160 → 166 · B738 154 → 160 |
| [CPD](https://en.wikipedia.org/wiki/Beijing_Capital_Airlines) | A21N 218 → 198 · A320 158 → 158 · A332 293 → 264 |
| [CSC](https://en.wikipedia.org/wiki/Sichuan_Airlines) | A20N 182 → 180 · A21N 203 → 198 · A319 128 → 132 · A321 203 → 194 · A332 300 → 272 |
| [CSN](https://en.wikipedia.org/wiki/China_Southern_Airlines) | A20N 182 → 166 · A21N 207 → 195 · A320 158 → 152 · A321 209 → 195 · A333 284 → 283 · A359 294 → 314 · B77W 313 → 361 |
| [CSZ](https://en.wikipedia.org/wiki/Shenzhen_Airlines) | A320 158 → 158 · B738 164 → 162 |
| [CUA](https://en.wikipedia.org/wiki/China_United_Airlines) | B737 128 → 144 · B738 144 → 186 |
| [CXA](https://en.wikipedia.org/wiki/XiamenAir) | B789 273 → 287 |
| [DAL](https://en.wikipedia.org/wiki/Delta_Air_Lines_fleet) | A332 234 → 223 · B763 218 → 216 |
| [DKH](https://en.wikipedia.org/wiki/Juneyao_Air) | A320 158 → 164 · B789 331 → 324 |
| [DLC](https://en.wikipedia.org/wiki/Dalian_Airlines) | B738（现属 CCD） 164 → 167 |
| [DLH](https://en.wikipedia.org/wiki/Lufthansa_fleet) | A319 124 → 138 · A333 254 → 255 · A343 249 → 279 · B744 271 → 371 |
| [ENY](https://en.wikipedia.org/wiki/Envoy_Air) | E170 62 → 65 |
| [EPA](https://en.wikipedia.org/wiki/Donghai_Airlines) | B738 170 → 170 |
| [ETD](https://en.wikipedia.org/wiki/Etihad_Airways_fleet) | A320 160 → 158 · A321 170 → 196 · A388 494 → 486 · B77W 322 → 370 · B789 299 → 299 |
| [EVA](https://en.wikipedia.org/wiki/EVA_Air) | B77W 327 → 323 · B789 304 → 278 |
| [EWG](https://en.wikipedia.org/wiki/Eurowings) | A21N 230 → 232 |
| [FDB](https://en.wikipedia.org/wiki/flydubai) | B38M 186 → 166 · B738 174 → 分舱座数待核实 |
| [FIN](https://en.wikipedia.org/wiki/Finnair) | A319 138 → 144 · A359 338 → 278 |
| [GCR](https://en.wikipedia.org/wiki/Tianjin_Airlines) | A332 264 → 260 · E195 104 → 122 |
| [GIA](https://en.wikipedia.org/wiki/Garuda_Indonesia) | A332 246 → 260 |
| [GLO](https://en.wikipedia.org/wiki/Gol_Linhas_A%C3%A9reas) | B737 144 → 138 |
| [GTI](https://en.wikipedia.org/wiki/Atlas_Air) | B744 0 → 客运或货运 |
| [HAL](https://en.wikipedia.org/wiki/Hawaiian_Airlines) | A21N 205 → 189 |
| [HBH](https://en.wikipedia.org/wiki/Hebei_Airlines) | B738 164 → 170 |
| [HKE](https://en.wikipedia.org/wiki/HK_Express) | A21N 230 → 236 |
| [HVN](https://en.wikipedia.org/wiki/Vietnam_Airlines) | A21N 200 → 203 · B789 283 → 274 |
| [HXA](https://en.wikipedia.org/wiki/China_Express_Airlines) | A320 158 → 172 · AJ27 90 → 95 · CRJ9 90 → 89 |
| [JAL](https://en.wikipedia.org/wiki/Japan_Airlines_fleet) | B763 229 → 252 |
| [JBU](https://en.wikipedia.org/wiki/JetBlue_Airways) | A21N 162 → 200 |
| [KAL](https://en.wikipedia.org/wiki/Korean_Air) | B739 171 → 188 |
| [KLM](https://en.wikipedia.org/wiki/KLM_fleet) | B737 142 → 142 · B739 188 → 188 · B772 318 → 286 · B77W 408 → 381 · B789 294 → 275 · B78X 344 → 318 |
| [LNI](https://en.wikipedia.org/wiki/Lion_Air) | B738 162 → 189 |
| [NKS](https://en.wikipedia.org/wiki/Spirit_Airlines) | A20N 186 → 176 · A320 182 → 176 · A321 228 → 222 |
| [QFA](https://en.wikipedia.org/wiki/Qantas_fleet) | B738 174 → 168 |
| [QTR](https://en.wikipedia.org/wiki/Qatar_Airways_fleet) | A21N 200 → 236 |
| [RAM](https://en.wikipedia.org/wiki/Royal_Air_Maroc) | B738 160 → 159 · B789 282 → 302 |
| [RLU](https://en.wikipedia.org/wiki/Rossiya_Airlines) | A319 136 → 128 · A320 150 → 168 |
| [SAS](https://en.wikipedia.org/wiki/Scandinavian_Airlines) | A20N 174 → 180 · A21N 198 → 157 · A333 262 → 262 |
| [SCX](https://en.wikipedia.org/wiki/Sun_Country_Airlines) | B738 162 → 186 |
| [SJX](https://en.wikipedia.org/wiki/Starlux_Airlines) | A359 299 → 306 · A35K 322 → 350 |
| [SVA](https://en.wikipedia.org/wiki/Saudia) | A21N 165 → 188 · A320 116 → 144 |
| [SWA](https://en.wikipedia.org/wiki/Southwest_Airlines_fleet) | B737 143 → 137 |
| [SWR](https://en.wikipedia.org/wiki/SWISS) | A320 152 → 180 · A343 219 → 215 · B77W 340 → 320 |
| [TAP](https://en.wikipedia.org/wiki/TAP_Air_Portugal) | A319 132 → 144 · A321 219 → 216 · A332 263 → 267 |
| [TGW](https://en.wikipedia.org/wiki/Scoot) | B789 340 → 375 |
| [THY](https://en.wikipedia.org/wiki/Turkish_Airlines_fleet) | A319 112 → 132 · A321 188 → 178 · A332 242 → 250 · B77W 340 → 349 |
| [UAL](https://en.wikipedia.org/wiki/United_Airlines_fleet) | B737 124 → 126 · B763 214 → 167 · B788 219 → 243 |
| [UEA](https://en.wikipedia.org/wiki/Chengdu_Airlines) | A320 158 → 180 |
| [VIV](https://en.wikipedia.org/wiki/VivaAerobus) | A320 186 → 180 |
| [VOI](https://en.wikipedia.org/wiki/Volaris) | A320 186 → 174 |
| [VOZ](https://en.wikipedia.org/wiki/Virgin_Australia) | B738 176 → 176 |
| [WJA](https://en.wikipedia.org/wiki/WestJet) | B737 136 → 132 |

</details>

## 按航司查原始资料

同一资料涵盖多个机型时共用一个链接。同一机型有多份资料时，后附的链接指向其他版本或补充来源。机型代码与[客舱源表](../data/cabin_layouts.json)一致。

| 航司 | 机型与资料 |
| --- | --- |
| 北部湾（CBG） | [A20N](https://seatmaps.com/airlines/gx-gx-airlines/airbus-a320neo/) |
| 国航（CCA） | [A20N](https://www.aerolopa.com/ca-32n) · [A21N](https://www.airchina.us/US/CN/info/aircraft-introduction/airbus321.html) · [A332、A333](https://www.airchina.us/US/CN/info/aircraft-introduction/airbus330.html) · [AJ27](https://static.airchina.com.cn/upload/file/content/1597825113056.pdf) · [B737、B738](https://www.airchina.us/US/CN/info/aircraft-introduction/boeing737.html) · [B744](https://www.airchina.us/US/CN/info/aircraft-introduction/boeing747.html) · [B77W](https://www.airchina.us/US/CN/info/aircraft-introduction/boeing777.html) |
| 大连（CCD） | [B738](https://seatmaps.com/airlines/ccd-dalian-airlines/boeing-737-800/)（[ICAO 代码](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html)） |
| 长龙（CDC） | [A20N](https://seatmaps.com/airlines/gj-loong-air/airbus-a320neo/) · [A21N](https://seatmaps.com/airlines/gj-loong-air/airbus-a321neo/) · [A320](https://seatmaps.com/airlines/gj-loong-air/airbus-a320/)（[caac.gov.cn](https://www.caac.gov.cn/XWZX/HYDT/201512/t20151202_15462.html)） · [B733](https://www.caac.gov.cn/XXGK/XXGK/TZTG/201512/t20151203_15584.html) |
| 山航（CDG） | [B38M](https://www.aerolopa.com/sc-7m8) · [B737](https://seatmaps.com/airlines/sc-shandong-airlines/boeing-737-700/) · [B738](https://www.aerolopa.com/sc-738-2)（[SC-738-1](https://www.aerolopa.com/sc-738-1)） |
| 东航（CES） | [A20N、A21N、A319、A321、A332、A333、B38M、B737、B738、B77W、B789](https://www.aerolopa.com/mu) · [A359](https://www.aerolopa.com/mu-359) · [AJ27](https://www.caac.gov.cn/XWZX/HYDT/202007/t20200709_203503.html) |
| 西部（CHB） | [A21N](https://news.cqnews.net/1/detail/1225467572093644800/h5/content_1225467572093644800.html)（[finance.sina.com.cn](https://finance.sina.com.cn/jjxw/2024-04-08/doc-inaqzyze5757710.shtml?cref=cj)） · [A320](https://static.cninfo.com.cn/finalpage/2018-07-20/1205207891.PDF) |
| 海航（CHH） | [A20N、A21N、A332、A333、A339、B38M、B789](https://www.hainanairlines.com/HUPortal/dyn/portal/DisplayPage?COUNTRY_SITE=AT&LANGUAGE=GB&PAGE=FLET&SITE=CBHZCBHZ) |
| 首航（CPD） | [A20N](https://seatmaps.com/airlines/jd-capital-airlines/airbus-a320neo/) · [A21N](https://www.aerolopa.com/jd-32q) · [A320](https://www.aerolopa.com/jd-320-5)（[JD-320-3](https://www.aerolopa.com/jd-320-3)、[JD-320-4](https://www.aerolopa.com/jd-320-4)、[JD-320-1](https://www.aerolopa.com/jd-320-1)、[JD-320-2](https://www.aerolopa.com/jd-320-2)） · [A332](https://www.aerolopa.com/jd-332-1)（[JD-332-2](https://www.aerolopa.com/jd-332-2)） |
| 春秋（CQH） | [A20N](https://www.aerolopa.com/9c-32n) · [A320](https://ajax.springairlines.com/content/invester/%E6%98%A5%E7%A7%8B%E8%88%AA%E7%A9%BA2025%E5%B9%B4%E5%B9%B4%E5%BA%A6%E6%8A%A5%E5%91%8A.pdf) |
| 川航（CSC） | [A20N、A21N、A319、A321、A332、A333](https://www.aerolopa.com/3u) · [A359](https://www.airbus.com/sites/g/files/jlcbta136/files/1d9c9fb6270a9727d639fb24f3dc5b53_Photo-Release-Sichuan-Airlines-takes-delivery-of-its-first-Airbus-A350.pdf) |
| 上航（CSH） | [B738](https://www.aerolopa.com/fm-738-2) |
| 南航（CSN） | [A20N](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/1b898hltfgpvq.shtml) · [A21N](https://www.csair.com/au/zh/tourguide/flight_service/cabin_layout/kongke/1b0hhmvlm1a3p.shtml) · [A319](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/18h1tr8m76mpj.shtml) · [A320](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/18h1tllaukv3c.shtml) · [A321](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/1ci6307p1lvuq.shtml) · [A333](https://www.csair.com/sg/en/tourguide/flight_service/cabin_layout/kongke/1cok4th40ctjs.shtml)（[csair.com](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/18h1sp092nli2.shtml)） · [A359](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/kongke/1dem5g3blpt83.shtml) · [AJ27](https://www.caac.gov.cn/XWZX/HYDT/202007/t20200709_203503.html) · [B738](https://www.csair.com/sg/zh/tourguide/flight_service/cabin_layout/boyin/1cn87en40mt4i.shtml) · [B77W](https://csair.com/sg/en/tourguide/flight_service/cabin_layout/boyin/1d8l5fmj01j95.shtml) · [C919](https://zn.caac.gov.cn/ZN_XXGK/ZN_HYDT/202410/t20241030_225713.html) |
| 顺丰（CSS） | [B738、B763](https://www.sf-airlines.com/news/447.html) |
| 深航（CSZ） | [A20N](https://www.aerolopa.com/zh-32n-3)（[ZH-32N-2](https://www.aerolopa.com/zh-32n-2)、[ZH-32N-1](https://www.aerolopa.com/zh-32n-1)） · [A21N](https://www.aerolopa.com/zh-32q)（[空客中国](https://www.sina.cn/news/detail/4844096290820683.html)） · [A320、B738](https://www.aerolopa.com/zh)（[globalpage.shenzhenair.com](https://globalpage.shenzhenair.com/zhair/cms/static/pages/wcm/static-navigation/Itinerary/CabinServices/CabinLayout/CabinLayout_en?language_id=102)） · [A333](https://globalpage.shenzhenair.com/zhair/cms/static/pages/wcm/static-navigation/Itinerary/CabinServices/CabinLayout/CabinLayout_en?language_id=102) · [A359](https://www.aerolopa.com/zh-359) · [B38M](https://www.aerolopa.com/zh) |
| 联航（CUA） | [B737](https://seatmaps.com/airlines/kn-china-united-airlines/boeing-737-700/) · [B738](https://seatmaps.com/airlines/kn-china-united-airlines/boeing-737-800/) |
| 厦航（CXA） | [B789](https://www.aerolopa.com/mf-789) |
| 吉祥（DKH） | [A20N](https://www.juneyao.com/upfile/202403/1414391975480.pdf) · [A21N](https://www.juneyao.com/en/news/detail.php?id=311) · [A320](https://www.aerolopa.com/ho-320) · [B789](https://global.juneyaoair.com/aircraftIntroduction/b787_9) |
| 东海（EPA） | [B738](https://www.aerolopa.com/dz-738-1)（[DZ-738-2](https://www.aerolopa.com/dz-738-2)） |
| 津航（GCR） | [A20N](https://seatmaps.com/airlines/gs-tianjin-airlines/airbus-a320neo/) · [A332](https://www.aerolopa.com/gs-332) · [E195](https://www.aerolopa.com/gs-e95) |
| 河北（HBH） | [B738](https://www.aerolopa.com/ns-738-2)（[NS-738-1](https://www.aerolopa.com/ns-738-1)） |
| 华夏（HXA） | [A20N](https://seatmaps.com/airlines/g5-china-express-airlines/airbus-a320neo/) · [A320](https://seatmaps.com/airlines/g5-china-express-airlines/airbus-a320/) · [AJ27](https://xzphotos.cn/aircraft-wiki-detail.php?reg=B-65A5)（[xueqiu.com](https://xueqiu.com/8381637663/317479623)） · [CRJ9](https://file.iyanbao.com/pdf/1284a-6dd99a16-fd73-4b8e-873f-98939ad3a495.pdf)（[xueqiu.com](https://xueqiu.com/8381637663/317479623)） |
| 青岛（QDA） | [A20N](https://seatmaps.com/airlines/qw-qingdao-airlines/airbus-a320neo/) |
| 成都（UEA） | [A20N](https://www.aerolopa.com/eu-32n) · [A320](https://www.aerolopa.com/eu-320) |
| 国泰（CPA） | [A21N](https://www.cathaypacific.com/cx/en_US/flying-with-us/aircraft-and-fleet/airbus-a320/a321neo.html) · [A35K](https://www.cathaypacific.com/cx/sc_CN/flying-with-us/aircraft-and-fleet/airbus-a350/1000.html) |
| 快运（HKE） | [A20N、A21N、A321](https://www.hkexpress.com/en/plan-your-trip/seats) |
| 澳航（AMU） | [A320](https://www.aerolopa.com/nx-320) · [A321](https://www.aerolopa.com/nx-321-1)（[NX-321-2](https://www.aerolopa.com/nx-321-2)） |
| 华航（CAL） | [B738](https://www.aerolopa.com/ci-738-1)（[CI-738-2](https://www.aerolopa.com/ci-738-2)） |
| 长荣（EVA） | [B77W](https://www.evaair.com/en-global/fly-prepare/our-fleets/passenger-airplanes/777-300ER/) · [B789](https://www.evaair.com/en-id/fly-prepare/our-fleets/passenger-airplanes/787-9/) |
| 星宇（SJX） | [A359](https://www.starlux-airlines.com/en-US/experience/walk-into-starlux/our-fleet)（[JX-359](https://www.aerolopa.com/jx-359)） · [A35K](https://www.starlux-airlines.com/en-US/experience/walk-into-starlux/our-fleet)（[JX-351](https://www.aerolopa.com/jx-351)） |
| 全日空（ANA） | [A20N](https://www.aerolopa.com/nh-32n) · [B788](https://www.aerolopa.com/nh-788-2)（[NH-78M](https://www.aerolopa.com/nh-78m)、[NH-78P](https://www.aerolopa.com/nh-78p)） |
| 乐桃（APJ） | [A20N、A21N、A320](https://www.flypeach.com/application/files/3117/7483/7722/2026_Peach.pdf) |
| 日航（JAL） | [B763](https://www.aerolopa.com/jl-763-a25)（[JL-763-A27](https://www.aerolopa.com/jl-763-a27)、[JL-763-A44](https://www.aerolopa.com/jl-763-a44)） |
| 星悦（SFJ） | [A20N](https://www.starflyer.jp/en/inboard/airbus/) |
| 韩亚（AAR） | [A321](https://flyasiana.com/C/US/EN/contents/a321-100-200)（[OZ-321](https://www.aerolopa.com/oz-321)） · [A333](https://www.aerolopa.com/oz-333-2)（[OZ-333-1](https://www.aerolopa.com/oz-333-1)） · [B772](https://www.aerolopa.com/oz-772-1)（[OZ-772-2](https://www.aerolopa.com/oz-772-2)、[OZ-772-3](https://www.aerolopa.com/oz-772-3)） |
| 大韩（KAL） | [B739](https://www.aerolopa.com/ke-739)（[KE-739ER](https://www.aerolopa.com/ke-739er)） |
| 泰亚航（AIQ） | [A20N](https://www.aerolopa.com/ak-32n) |
| 亚航（AXM） | [A20N](https://www.aerolopa.com/ak-32n) |
| Bamboo（BAV） | [A20N](https://www.bambooairways.com/bamboo-airways/our-fleet) |
| 宿务（CEB） | [A20N](https://cebupacificair.a.bigcontent.io/v1/static/2023%20CEB%20Annual%20Report%20%28Final%29)（[5J-32N](https://www.aerolopa.com/5j-32n)、[5J-32N-2](https://www.aerolopa.com/5j-32n-2)） |
| Citilink（CTV） | [A20N](https://www.aerolopa.com/qg-32n) |
| 鹰航（GIA） | [A332](https://www.aerolopa.com/ga-332-2)（[GA-332-1](https://www.aerolopa.com/ga-332-1)） |
| 越航（HVN） | [A20N](https://www.vietnamairlines.com/vn/en/vietnam-airlines/our-fleets/Airbus-a320-neo) · [A21N](https://www.aerolopa.com/vn-32q)（[VN-32Q-2](https://www.aerolopa.com/vn-32q-2)） · [B789](https://www.aerolopa.com/vn-789-1)（[VN-789-2](https://www.aerolopa.com/vn-789-2)） |
| 狮航（LNI） | [B738](https://www.aerolopa.com/jt-738) |
| 酷航（TGW） | [A20N](https://cdn.flyscoot.com/prod/docs/default-source/doc-our-fleet/airbus-a320-family-seat-map_2025.pdf) · [B789](https://cdn.flyscoot.com/prod/docs/default-source/doc-our-fleet/b787_seat_map.pdf) |
| 印航（AIC） | [A20N](https://www.airindia.com/in/en/newsroom/articles/neo-experience-onboard-air-india.html) · [A21N](https://www.aerolopa.com/ai-32q) · [A320](https://www.aerolopa.com/ai-320) |
| 斯航（ALK） | [A20N、A21N、A332、A333](https://onboard.srilankan.com/en_uk/flying-with-us/fleet) |
| 靛蓝（IGO） | [A20N](https://www.aerolopa.com/6e-32n-1)（[6E-32N-2](https://www.aerolopa.com/6e-32n-2)） |
| Vistara（VTI） | [A20N](https://www.airbus.com/en/newsroom/press-releases/2017-05-vistara-receives-its-first-a320neo) |
| Air Arabia（ABY） | [A20N](https://press.airarabia.com/air-arabia-welcomes-its-first-airbus-a320neo-aircraft/) |
| AZAL（AHY） | [A20N](https://www.aerolopa.com/j2-32n)（[J2-32N-2](https://www.aerolopa.com/j2-32n-2)） |
| 阿提哈德（ETD） | [A20N](https://www.aerolopa.com/ey-32n) · [A320](https://www.aerolopa.com/ey-320-2)（[EY-320-1](https://www.aerolopa.com/ey-320-1)） · [A321](https://www.aerolopa.com/ey-321) · [A388](https://www.etihad.com/en-gb/news/etihad-airways-first-flagship-airbus-a380-arrives-in-singapore)（[etihad.com](https://www.etihad.com/content/dam/eag/etihadairways/etihadcom/2025/global/products/our-fleet/a380/A380_Seatmap.pdf)） · [B77W](https://www.aerolopa.com/ey-77w-2)（[EY-77W-1](https://www.aerolopa.com/ey-77w-1)、[EY-77W-3](https://www.aerolopa.com/ey-77w-3)） · [B789](https://www.aerolopa.com/ey-789-4)（[EY-789-1](https://www.aerolopa.com/ey-789-1)、[EY-789-2](https://www.aerolopa.com/ey-789-2)、[EY-789-3](https://www.aerolopa.com/ey-789-3)） |
| Flydubai（FDB） | [B38M](https://news.flydubai.com/flydubai-participates-at-the-dubai-airshow-with-one-of-its-boeing-737-max-8-aircraft) · [B738](https://www.flydubai.com/en/help/our-fleet/)（[FZ-738](https://www.aerolopa.com/fz-738)） |
| 海湾（GFA） | [A20N](https://www.gulfair.com/)（[GF-32N-1](https://www.aerolopa.com/gf-32n-1)） |
| 科航（KAC） | [A20N](https://www.airbus.com/en/newsroom/press-releases/2019-09-kuwait-airways-takes-delivery-of-its-first-a320neo) · [A21N](https://www.airbus.com/en/newsroom/press-releases/2025-05-airbus-delivers-first-a321neo-for-kuwait-airways) |
| 卡航（QTR） | [A21N](https://www.aerolopa.com/qr-32q-1) |
| 约航（RJA） | [A20N](https://www.rj.com/en/fly-rj/our-fleet/A320neo) |
| 沙航（SVA） | [A21N](https://www.aerolopa.com/sv-32q) · [A320](https://www.aerolopa.com/sv-32n)（[SV-32U](https://www.aerolopa.com/sv-32u)） |
| Aegean（AEE） | [A20N](https://en.aegeanair.com/company/fleet/airbus-a320neo/?app_version=17&origin=app&sc_site=aboutaegean) · [A320](https://en.aegeanair.com/company/fleet/airbus-a320/?sc_site=aboutaegean) · [A321](https://en.aegeanair.com/company/fleet/airbus-a321/?app_version=17&origin=app&sc_site=aboutaegean) |
| 法航（AFR） | [A332](https://corporate.airfrance.com/en/press-releases/summer-2022-air-france-serve-quebec-city-paris-charles-de-gaulle-its-4th-destination) · [B772](https://www.aerolopa.com/af-772) |
| 奥航（AUA） | [A20N](https://www.austrian.com/ge/en/airbus-a320neo) · [A320](https://www.austrian.com/xx/en/airbus-a320-200.solo_continue) |
| 布鲁塞尔（BEL） | [A20N](https://www.brusselsairlines.com/am/en/flying-with-us/our-fleet/airbus-320n) |
| Condor（CFG） | [A20N、A21N](https://www.condor.com/eu/fly-enjoy/condor-partner/our-fleet/airbus-a320neo-a321neo.jsp) |
| 汉莎（DLH） | [A20N](https://www.lufthansa.com/us/en/32v) · [A21N](https://www.lufthansa.com/us/en/32q) · [A319](https://www.lufthansa.com/us/en/319) · [A320](https://www.lufthansa.com/us/en/320) · [A321](https://www.lufthansa.com/us/en/321) · [A333](https://www.lufthansagroup.com/en/company/fleet/lufthansa-and-regional-partners/airbus-a330-300.html) · [A343](https://www.aerolopa.com/lh-343) · [B744](https://www.lufthansagroup.com/en/company/fleet/lufthansa-and-regional-partners/boeing-747-400.html) |
| Eurowings（EWG） | [A20N、A21N](https://www.eurowings.com/en/information/about-us/engineering-fleet.html) |
| 芬航（FIN） | [A319](https://www.finnair.com/gb-en/frequently-asked-questions/seats-and-travel-classes/what-kind-of-seats-do-you-have-in-business-class-on-flights-within-europe-and-the-middle-east--1905004)（[finnair.com](https://www.finnair.com/en/flight-information/finnair-fleet)） · [A359](https://www.aerolopa.com/ay-359-1)（[AY-359-2](https://www.aerolopa.com/ay-359-2)） |
| 意航（ITY） | [A20N](https://www.ita-airways.com/content/dam/ita/files/EN/fly/ita-world/societ%C3%A0-trasparente/ITA_Airways_CARTA_SERVIZI_EN.pdf) |
| 荷航（KLM） | [B737](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-737-700) · [B739](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-737-900?showredirectnotice=us) · [B772](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-777-200er)（[KL-772-2](https://www.aerolopa.com/kl-772-2)） · [B77W](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-777-300er?showredirectnotice=us)（[KL-77W](https://www.aerolopa.com/kl-77w)） · [B789](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-787-9?showredirectnotice=us)（[KL-789](https://www.aerolopa.com/kl-789)） · [B78X](https://www.klm.com/information/travel-class-extra-options/aircraft-types/boeing-787-10)（[KL-781](https://www.aerolopa.com/kl-781)） |
| Pegasus（PGT） | [A20N](https://www.pegasusinvestorrelations.com/medium/image/pgsus-2026-q1-investor-presentation_1617/view.aspx)（[PC-32N](https://www.aerolopa.com/pc-32n)） |
| SAS（SAS） | [A20N](https://www.sasgroup.net/about-sas/the-fleet/a320neo-a321lr/)（[sasgroup.net](https://www.sasgroup.net/newsroom/press-releases/2025/high-demand-as-sas-reintroduces-european-business-class-starting-october-1/)） · [A21N](https://www.sasgroup.net/newsroom/press-releases/2021/sas-brand-new-airbus-a321-long-range-first-flight/) · [A333](https://www.sasgroup.net/about-sas/the-fleet/airbus-a330-300-and-airbus-a340-300/)（[sasgroup.net](https://www.sasgroup.net/newsroom/press-releases/2015/sas-first-in-europe-to-fly-the-new-airbus-a330-300-enhanced/)） |
| 瑞航（SWR） | [A20N、A21N、A320、A321](https://www.swiss.com/us/en/discover/fleet/airbus-shorthaul) · [A343](https://www.aerolopa.com/lx-343) · [B77W](https://www.swiss.com/ch/en/discover/fleet/boeing) |
| TAP（TAP） | [A319](https://www.aerolopa.com/tp-319)（[flytap.com](https://www.flytap.com/-/media/Flytap/PDF/Revistas-UP/UP-MAGAZINE_20200201_148.pdf?hash=CB98FF2D0DCB8F14D28AFA6590B1B216621BFBFC&la=pt-PT)） · [A321](https://www.aerolopa.com/tp-321) · [A332](https://www.aerolopa.com/tp-332) |
| 土航（THY） | [A319](https://www.aerolopa.com/tk-319) · [A321](https://www.aerolopa.com/tk-32m)（[TK-32R-2](https://www.aerolopa.com/tk-32r-2)） · [A332](https://www.aerolopa.com/tk-332)（[TK-33A](https://www.aerolopa.com/tk-33a)、[TK-33M](https://www.aerolopa.com/tk-33m)） · [B77W](https://www.aerolopa.com/tk-77w-1)（[TK-77W-2](https://www.aerolopa.com/tk-77w-2)） |
| Transavia（TVF） | [A20N](https://corporate.transavia.com/en-EU/organisation/fleet/) |
| 伏林（VLG） | [A20N](https://www.aerolopa.com/vy-32n) |
| 维兹（WZZ） | [A20N](https://www.aerolopa.com/w6-32n) |
| 英航（BAW） | [A20N](https://www.britishairways.com/content/information/about-ba/fleet-facts/airbus-a320neo) · [A21N](https://www.aerolopa.com/ba-32q-1)（[BA-32Q-2](https://www.aerolopa.com/ba-32q-2)） · [A319](https://www.britishairways.com/content/information/about-ba/fleet-facts/airbus-a319-100) · [A320](https://www.britishairways.com/content/information/about-ba/fleet-facts/airbus-a320-200) · [B772](https://www.aerolopa.com/ba-77l)（[BA-77M](https://www.aerolopa.com/ba-77m)、[BA-77S](https://www.aerolopa.com/ba-77s)、[BA-77T](https://www.aerolopa.com/ba-77t)） · [B77W](https://www.aerolopa.com/ba-77h) · [B788](https://www.aerolopa.com/ba-78e) |
| 爱航（EIN） | [A20N](https://mediacentre.aerlingus.com/news/26092022/aer-lingus-takes-delivery-of-first-new-generation-a320neo-aircraft) |
| 易捷（EZY） | [A20N](https://www.aerolopa.com/u2-32n) |
| 美航（AAL） | [A21N、A319、A320、A321、B38M、B738、CRJ7、E145、E170](https://www.aa.com/web/i18n/travel-info/experience/planes/planes.html) |
| 阿拉斯加（ASA） | [B738](https://www.alaskaair.com/content/travel-info/our-aircraft/737-800) |
| 达美（DAL） | [A21N](https://www.delta.com/us/en/aircraft/airbus/a321-neo) · [A319](https://www.delta.com/us/en/aircraft/airbus/a319) · [A321](https://www.delta.com/us/en/aircraft/airbus/a321) · [A332](https://www.delta.com/us/en/aircraft/airbus/a330-200) · [A333](https://www.delta.com/us/en/aircraft/airbus/a330-300) · [A339](https://www.delta.com/us/en/aircraft/airbus/a330-900) · [B712](https://www.delta.com/us/en/aircraft/boeing/717) · [B738](https://www.delta.com/us/en/aircraft/boeing/737-800) · [B739](https://www.delta.com/us/en/aircraft/boeing/737-900er) · [B752](https://www.delta.com/us/en/aircraft/boeing/757-200) · [B753](https://www.delta.com/us/en/aircraft/boeing/757-300) · [B763](https://www.delta.com/us/en/aircraft/boeing/767-300er) · [BCS1](https://www.delta.com/us/en/aircraft/airbus/a220-100) · [BCS3](https://www.delta.com/us/en/aircraft/airbus/a220-300) · [CRJ7](https://www.delta.com/us/en/aircraft/bombardier/crj-700) · [CRJ9](https://www.delta.com/us/en/aircraft/bombardier/crj-900) |
| Envoy（ENY） | [E170](https://www.envoyair.com/our-company/)（[aa.com](https://www.aa.com/web/i18n/travel-info/experience/planes/planes.html)） |
| Atlas（GTI） | [B744](https://www.atlasair.com/passenger-services/our-passenger-fleet/747-400-vip-n480mc/)（[atlasair.com](https://www.atlasair.com/cargo-services/our-cargo-fleet/)） |
| 夏威夷（HAL） | [A21N](https://www.aerolopa.com/ha-32q) |
| 捷蓝（JBU） | [A21N](https://www.jetblue.com/help/seats)（[B6-3N1](https://www.aerolopa.com/b6-3n1)、[B6-3NL](https://www.aerolopa.com/b6-3nl)、[B6-3NS](https://www.aerolopa.com/b6-3ns)） |
| 精神（NKS） | [A20N、A21N、A320、A321](https://ir.spirit.com/files/doc_financials/2024/q4/SAVE-2024-12-31-24-10K.pdf) |
| Sun Country（SCX） | [B738](https://ir.suncountry.com/static-files/f11a9687-e6a3-4749-9ec9-419663d78ee4) |
| 西南（SWA） | [B737](https://support.southwest.com/helpcenter/article/airplane-specifications) |
| 美联航（UAL） | [B737](https://www.aerolopa.com/ua-73g) · [B763](https://www.united.com/en/us/fly/company/aircraft/boeing-767-300er.html)（[UA-76L](https://www.aerolopa.com/ua-76l)） · [B788](https://www.aerolopa.com/ua-78h) |
| 加航（ACA） | [A320](https://www.aerolopa.com/ac-320-1)（[AC-320-2](https://www.aerolopa.com/ac-320-2)、[AC-320-3](https://www.aerolopa.com/ac-320-3)、[AC-320-5](https://www.aerolopa.com/ac-320-5)、[AC-320-4](https://www.aerolopa.com/ac-320-4)） · [A321](https://www.aerolopa.com/ac-321-2)（[AC-321-3](https://www.aerolopa.com/ac-321-3)） · [B77L](https://www.aerolopa.com/ac-77l) · [B788](https://www.aerolopa.com/ac-788) |
| 西捷（WJA） | [B737](https://www.aerolopa.com/ws-73g) |
| 新航（ANZ） | [A20N](https://www.airnewzealand.com/seat-map-airbus-a320neo-165i) · [A320](https://www.aerolopa.com/nz-320) |
| 捷星（JST） | [A20N、B788](https://www.jetstar.com/au/en/about-us/our-fleet) |
| 澳航（QFA） | [B738](https://www.qantas.com/en-ph/onboard/fleet/737)（[历史座位图](https://www.qantas.com/infodetail/flying/inTheAir/ourAircraft/738-12J162Y.pdf)） |
| 维珍澳洲（VOZ） | [B738](https://www.virginaustralia.com/au/en/travel-info/flying-with-us/our-fleet//)（[VA-738-1](https://www.aerolopa.com/va-738-1)、[VA-738-3](https://www.aerolopa.com/va-738-3)、[VA-738-2](https://www.aerolopa.com/va-738-2)） |
| 墨航（AMX） | [B38M](https://www.aerolopa.com/am-7m8) · [B738](https://www.aerolopa.com/am-738-1) · [B789](https://www.aerolopa.com/am-789) |
| Avianca（AVA） | [A20N](https://www.avianca.com/en/about-us/our-fleet)（[AV-32N-1](https://www.aerolopa.com/av-32n-1)） · [A319、A320](https://www.avianca.com/en/about-us/our-fleet) |
| Azul（AZU） | [A20N](https://www.aerolopa.com/ad-32n)（[AD-32N-2](https://www.aerolopa.com/ad-32n-2)） |
| Copa（CMP） | [B38M、B738](https://ir.copaair.com/static-files/018c23e5-2046-4f25-b739-6a961ff55cbb) |
| Gol（GLO） | [B737](https://www.voegol.com.br/en-US/nh/b737-700) |
| JetSMART（JAT） | [A20N](https://www.aerolopa.com/ja-32n) |
| LATAM Brasil（TAM） | [A20N](https://seatmaps.com/airlines/jj-latam-brasil/airbus-a320neo/) |
| Viva（VIV） | [A20N](https://www.aerolopa.com/vb-32n) · [A320](https://www.aerolopa.com/vb-320) |
| Volaris（VOI） | [A20N](https://www.aerolopa.com/y4-32n-1) · [A320](https://www.aerolopa.com/y4-320-1)（[Y4-320-2](https://www.aerolopa.com/y4-320-2)、[Y4-320-3](https://www.aerolopa.com/y4-320-3)） |
| 埃航（MSR） | [A20N](https://www.egyptair.com/en/about-egyptair/fleet/pages/fleet-details.aspx?AirCraft=15) |
| 摩航（RAM） | [B738](https://www.aerolopa.com/at-738) · [B789](https://www.aerolopa.com/at-789)（[AT-789-2](https://www.aerolopa.com/at-789-2)） |
| 俄航（AFL） | [A20N](https://seatmaps.com/airlines/su-aeroflot/airbus-a320neo/)（[aeroflot.ru](https://www.aeroflot.ru/info/seatmaps-fleet/)） |
| Air Astana（KZR） | [A20N](https://www.aerolopa.com/kc-32n) |
| Rossiya（RLU） | [A319](https://www.rossiya-airlines.ru/about/news/airbus_a319_ei_ezs_aviakompaniya_rossiya_pristupil_k_poletam/) · [A320](https://www.rossiya-airlines.ru/about/about_us/fleet/vozdushnye_suda/) |
| S7（SBI） | [A20N](https://www.airbus.com/en/newsroom/press-releases/2017-07-s7-airlines-takes-delivery-of-its-first-a320neo) |
| 乌兹航（UZB） | [A20N](https://www.aerolopa.com/hy-32n-1)（[HY-32N-2](https://www.aerolopa.com/hy-32n-2)） |

## 撤销的旧键

| 原记录 | 撤销原因与依据 |
| --- | --- |
| `CSZ:A321` | 深航已查到的 A321 座位图属于 A321neo（A21N）。原 A321ceo 条目缺少实际构型依据。 [来源](https://www.aerolopa.com/zh) |
| `SIA:B789` | 原条目标注的 787-10 对应 B78X，另有独立条目。 [来源](https://www.singaporeair.com/content/dam/sia/web-assets/pdfs/about-us/information-for-investors/financial-results/slide-q2fy2627.pdf) |
| `SIA:A35K` | 原条目将新航长程 A350-900 误挂到 A350-1000。 [来源](https://www.singaporeair.com/content/dam/sia/web-assets/pdfs/about-us/information-for-investors/financial-results/slide-q2fy2627.pdf) |
| `DKH:B738` | 吉祥航空公布的客机为 787-9 和 A320 系列，原 737-800 专属条目缺少依据。 [来源](https://www.juneyaoair.com/modelIntro/index) |
| `AAR:B738`、`AAR:B763`、`AAR:B767F`、`AAR:B77L` | 原条目将顺丰航空挂在韩亚航空代码下。顺丰已确认的构型收录在 CSS。 [来源](https://www.sf-airlines.com/news/447.html) |
| `CES:B738SAH` | B738SAH 为原表自造的上航代码，上航 737-800 使用 CSH:B738。 [来源](https://www.aerolopa.com/fm-738-2) |
| `AAR:A332` | 原条目的说明与座位图均指向 A330-300，对应 AAR:A333。 [来源](https://www.aerolopa.com/oz-333-2) |
| `DLC:B738` | 大连航空的 ICAO 代码为 CCD，已改挂 CCD:B738。 [来源](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html) |
| `CCD:A320` | 原记录属于长龙，已改挂 CDC:A320。 [来源](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html) |

另外，原 JSON 中有 6 个重复键。清理后，每个航司机型键仅定义一次。构建测试会拒绝重复键，并逐一比较行式、列式、照片补全表和源表中的客舱。
