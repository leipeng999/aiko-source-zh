#!/usr/bin/env python3
"""Generate a Chinese display mirror of Aiko's AltSource.
Only presentation metadata is translated; install-critical fields are preserved.
"""
import json
import urllib.request
from copy import deepcopy
from pathlib import Path

SOURCE_URL = "https://Aiko3993.github.io/iOS-Sideload-Source/sources/standard/coexist/source.json"
OUT = Path(__file__).with_name("aiko_source_zh.json")

translations = {
    "Aidoku": ("Aidoku（漫画阅读器）", "免费开源的 iOS / iPadOS 漫画阅读器。", "免费开源的 iOS / iPadOS 漫画阅读应用。"),
    "Aidoku (Nightly)": ("Aidoku（夜间版）", "免费开源的 iOS / iPadOS 漫画阅读器（测试版）。", "Aidoku 的夜间构建版本，适合体验最新功能。"),
    "Amethyst (Nightly)": ("Amethyst（夜间版）", "适用于 Android 和 iOS 的《我的世界：Java 版》启动器。", "基于 PojavLauncher 的 iOS / iPadOS 版本，属于夜间构建。"),
    "Animeko": ("Animeko（番剧追番）", "一站式弹幕追番平台，支持 Bangumi 云同步、缓存和多视频源。", "支持观看记录云同步、多视频数据源、离线缓存、弹幕和 BitTorrent 等功能。"),
    "Apollo": ("Apollo（Reddit 客户端）", "功能丰富、支持高度自定义的 Reddit 客户端。", "专为 iOS 设计的第三方 Reddit 客户端，支持手势、媒体浏览、Markdown、多账号和深色模式。"),
    "Asspp": ("Asspp（多账号 App Store）", "管理不同国家和地区 Apple 账号及 IPA 的工具。", "用于切换不同地区商店、下载应用和管理 IPA 库。"),
    "Feather": ("Feather（签名安装工具）", "免费的设备端 iOS 应用管理和签名安装工具。", "基于 UIKit 构建的设备端 iOS 应用管理器和安装器。"),
    "Ferrite": ("Ferrite（媒体搜索）", "支持插件扩展的 iOS 媒体搜索工具。", "支持通过插件 API 扩展功能的 iOS 媒体搜索应用。"),
    "iSH (Pre-release)": ("iSH（预览版）", "在 iPhone 和 iPad 上运行 Linux Shell。", "通过用户态 x86 模拟和系统调用转换，在 iOS 上运行 Linux Shell。"),
    "iTorrent": ("iTorrent（种子客户端）", "支持后台下载、磁力链接和文件 App 的 iOS 种子客户端。", "支持后台下载、磁力链接、文件 App、WebDAV、动态岛进度和外置硬盘等功能。"),
    "Kazumi": ("Kazumi（番剧采集）", "基于自定义规则的番剧采集和在线观看应用。", "支持自定义规则、规则导入分享、弹幕和基于 Anime4K 的实时超分辨率。"),
    "Ksign": ("Ksign（签名工具）", "简洁的 iOS 代码签名工具。", "一款面向 iOS 的代码签名应用。"),
    "LiveContainer": ("LiveContainer（容器运行）", "无需真正安装即可运行 iOS 应用。", "在容器中运行 iOS 应用，减少对系统安装的依赖。"),
    "LiveContainer (Nightly)": ("LiveContainer（夜间版）", "无需真正安装即可运行 iOS 应用的测试版。", "LiveContainer 的夜间构建版本。"),
    "LiveContainer+SideStore": ("LiveContainer + SideStore", "结合 SideStore 的 iOS 应用容器。", "在容器中运行 iOS 应用，并集成 SideStore。"),
    "LiveContainer+SideStore (Nightly)": ("LiveContainer + SideStore（夜间版）", "结合 SideStore 的 iOS 应用容器测试版。", "LiveContainer + SideStore 的夜间构建版本。"),
    "Luna": ("Luna", "轻量的 iOS 应用。", "可通过 Xcode 或项目 Nightly 构建页面提供的 IPA 安装。"),
    "Mangayomi": ("Mangayomi（漫画与番剧）", "开源的漫画、小说和番剧阅读应用。", "基于 Flutter 的开源跨平台应用，用于阅读漫画、小说和观看番剧。"),
    "NeoFreeBird": ("NeoFreeBird（X 客户端）", "外观接近现代 X 应用的第三方客户端。", "NeoFreeBird 项目版本。"),
    "NeoFreeBird (Twitter)": ("NeoFreeBird（Twitter 版）", "开源的 Twitter 修改版客户端。", "恢复旧版 Twitter 品牌样式，并包含去广告等增强功能；请先查看项目说明和许可。"),
    "NeoFreeBird (X)": ("NeoFreeBird（X 版）", "开源的 X 修改版客户端。", "包含界面调整和部分增强功能；请先查看项目说明和许可。"),
    "Nyxian": ("Nyxian（iOS 开发工具）", "在原生 iOS 上开发代码和工具的 IDE。", "面向原生 iOS 开发的实验性 IDE 和工具。"),
    "PiliPlus": ("PiliPlus（哔哩哔哩客户端）", "第三方哔哩哔哩客户端。", "可以从 GitHub Releases 下载，也可以克隆仓库后自行编译。"),
    "Pixiv-SwiftUI": ("Pixiv-SwiftUI（Pixiv 客户端）", "面向 Apple 平台的第三方 Pixiv 客户端。", "同时支持 iOS、iPadOS 和 macOS。"),
    "PPSSPP": ("PPSSPP（PSP 模拟器）", "适用于 iOS、Android、Windows、Mac 和 Linux 的 PSP 模拟器。", "使用 C++ 编写的快速、跨平台 PSP 模拟器。"),
    "SideStore": ("SideStore（侧载工具）", "无需 AltServer 的 AltStore 分支。", "使用 Apple ID 在 iPhone 上侧载和刷新应用的开源工具。"),
    "SideStore (Nightly)": ("SideStore（夜间版）", "SideStore 的最新测试构建版本。", "SideStore 的夜间构建版本，可能包含尚未稳定的功能。"),
    "StikDebug": ("StikDebug（JIT 工具）", "适用于 iOS 17.4 及以上版本的设备端调试和 JIT 工具。", "首次配对后，无需电脑即可为侧载应用启用 JIT。"),
    "UTM": ("UTM（虚拟机）", "适用于 iOS、macOS 和 visionOS 的虚拟机和系统模拟器。", "基于 QEMU，可在 Mac、iPhone 和 iPad 上运行 Windows、Linux 等系统。"),
    "UTM HV": ("UTM HV（虚拟机）", "使用 Hypervisor 的 iOS / macOS 虚拟机版本。", "UTM 的 Hypervisor 版本。"),
    "Venera": ("Venera（漫画阅读器）", "支持本地漫画和网络漫画的阅读器。", "支持阅读本地漫画和网络漫画。"),
}

def main():
    req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    out = deepcopy(data)
    out["name"] = "iOS 侧载源（共存版）"
    out["subtitle"] = "Aiko3993 中文开源 iOS 侧载源"
    out["description"] = "自动从 GitHub Releases / Artifacts 获取最新 IPA 的中文化显示源。仅翻译名称和说明，安装地址及版本字段保持原样。"
    out["website"] = "https://github.com/Aiko3993/iOS-Sideload-Source"
    out["apps"] = []
    for app in data.get("apps", []):
        a = deepcopy(app)
        if app.get("name") in translations:
            name, subtitle, desc = translations[app["name"]]
            a["name"], a["subtitle"], a["localizedDescription"] = name, subtitle, desc
        else:
            a["name"] = "中文显示：" + app.get("name", "")
        # Preserve bundleIdentifier, versions, downloadURL, size, hashes, minOSVersion, iconURL unchanged.
        out["apps"].append(a)
    out["news"] = []
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写入 {OUT}，应用数：{len(out['apps'])}")

if __name__ == "__main__":
    main()
