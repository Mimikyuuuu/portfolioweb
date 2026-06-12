# 个人作品集小游戏技术设计文档 (TDD)

## 1. 系统架构与技术栈

### 1.1 MVP 架构定位

MVP 阶段采用**纯前端静态架构**。React 负责作品页、路由状态、数据渲染和整体应用状态；Phaser 3 负责横版地图、角色移动、NPC 碰撞检测和游戏内交互提示。

后端、数据库、CMS、登录鉴权和 API 管理暂不进入 MVP 范围，作为后续扩展方向保留。

### 1.2 技术栈

* **前端框架：** React 18+。
* **开发语言：** TypeScript。
* **游戏引擎：** Phaser 3。
* **样式方案：** TailwindCSS 或项目内统一 CSS Modules/全局 CSS，具体以初始化项目结构为准。
* **内容数据：** 本地 `projects.json` + Markdown + 静态图片资源。
* **部署平台：** Vercel。

### 1.3 运行模式

应用只有一个前端入口：

```text
React App
  |
  |-- PhaserGameContainer
  |     |-- Phaser Game Instance
  |     |-- Forest Scene
  |
  |-- ProjectPageLayer
        |-- Teardown Page
        |-- Push Article Page
        |-- Social Video Page
        |-- Gallery Page
```

Phaser 游戏实例只初始化一次。进入作品页时隐藏游戏容器并暂停场景；返回地图时恢复游戏容器并继续场景，避免玩家位置和状态丢失。

---

## 2. 目录与资源结构

建议使用以下结构组织 MVP 资源：

```text
src/
  app/
    App.tsx
  components/
    BackToMapButton.tsx
  data/
    projects.json
  game/
    PhaserGame.tsx
    scenes/
      ForestScene.ts
    types.ts
  pages/
    TeardownPage.tsx
    PushArticlesPage.tsx
    SocialVideosPage.tsx
    GalleryPage.tsx
  styles/
    globals.css

public/
  articles/
    pokopia.md
    pokopia.jpeg
    September.png

  videos/
    nikki.JPEG

  gallery/
    luye.png

  assets/
    character/
      figure.png
      stand.png
      walk.png
    game/
      forest-background/
      npc/
      ui/
```

当前静态素材统一放在 `public/` 下。代码中使用 `/articles/...`、`/videos/...`、`/gallery/...`、`/assets/...` 这类根路径访问。

---

## 3. 数据模型设计

### 3.1 静态数据源

MVP 使用 `src/data/projects.json` 作为唯一作品数据入口。组件和游戏逻辑不得直接硬编码作品标题、图片路径、外链 URL 或平台数据。

推荐结构：

```json
{
  "npcs": [
    {
      "id": "teardown-npc",
      "label": "游戏拆解",
      "targetType": "teardowns",
      "x": 500,
      "outfitColor": "green"
    },
    {
      "id": "article-npc",
      "label": "推送文章",
      "targetType": "pushArticles",
      "x": 1000,
      "outfitColor": "blue"
    },
    {
      "id": "video-npc",
      "label": "视频作品",
      "targetType": "socialVideos",
      "x": 1500,
      "outfitColor": "pink"
    },
    {
      "id": "gallery-npc",
      "label": "绘画画廊",
      "targetType": "gallery",
      "x": 2000,
      "outfitColor": "yellow"
    }
  ],
  "teardowns": [
    {
      "id": "pokopia",
      "title": "Pokopia 游戏拆解",
      "cover": "/articles/pokopia.jpeg",
      "markdown": "/articles/pokopia.md",
      "date": "",
      "tags": ["游戏拆解"]
    }
  ],
  "pushArticles": [
    {
      "id": "september",
      "title": "九月",
      "cover": "/articles/September.png",
      "date": "2024.10.11",
      "url": "https://mp.weixin.qq.com/s/oT5bF9JsCGuUpPRbsYVEgA"
    }
  ],
  "socialVideos": [
    {
      "id": "nikki-wild-heart",
      "title": "【旷野之心 x 蝴蝶舞蹈】暖暖，妈妈是野人！",
      "cover": "/videos/nikki.JPEG",
      "url": "https://www.bilibili.com/video/BV1NcCdBGEmX/?share_source=copy_web&vd_source=fa8e02ed23b5d501820a9b9949ec639d",
      "platformStats": [
        {
          "platform": "小红书",
          "views": 686,
          "likes": 95,
          "collects": 16
        },
        {
          "platform": "B站",
          "views": 188,
          "likes": 22,
          "collects": 3
        }
      ]
    }
  ],
  "gallery": [
    {
      "id": "luye",
      "title": "鹿野无料",
      "image": "/gallery/luye.png",
      "thumbnail": "/gallery/luye.png",
      "date": "",
      "tools": [],
      "description": "无"
    }
  ]
}
```

### 3.2 TypeScript 类型建议

```typescript
type ProjectTargetType = 'teardowns' | 'pushArticles' | 'socialVideos' | 'gallery';

interface NpcConfig {
  id: string;
  label: string;
  targetType: ProjectTargetType;
  x: number;
  outfitColor: string;
}

interface TeardownProject {
  id: string;
  title: string;
  cover: string;
  markdown: string;
  date?: string;
  tags?: string[];
}

interface PushArticleProject {
  id: string;
  title: string;
  cover: string;
  date: string;
  url: string;
}

interface PlatformStats {
  platform: string;
  views: number;
  likes: number;
  collects: number;
}

interface SocialVideoProject {
  id: string;
  title: string;
  cover: string;
  url: string;
  platformStats: PlatformStats[];
}

interface GalleryProject {
  id: string;
  title: string;
  image: string;
  thumbnail: string;
  date?: string;
  tools?: string[];
  description: string;
}
```

---

## 4. React 与 Phaser 通信设计

### 4.1 顶层状态

React 顶层维护应用状态：

```typescript
type ActiveView = 'map' | 'teardowns' | 'pushArticles' | 'socialVideos' | 'gallery';

interface GamePosition {
  x: number;
  y: number;
}

interface AppState {
  activeView: ActiveView;
  lastPlayerPosition: GamePosition;
}
```

### 4.2 交互流程

```text
玩家靠近 NPC
  |
Phaser 显示 [E] 查看作品
  |
玩家按 E
  |
Phaser 读取玩家坐标和 NPC targetType
  |
调用 React 注入的 onEnterProject(targetType, position)
  |
React 保存 lastPlayerPosition
  |
React 将 activeView 切换为对应作品页
  |
Phaser pause + Canvas 隐藏
```

返回地图：

```text
点击 ← 返回地图 或按 ESC
  |
React 将 activeView 切回 map
  |
Canvas 显示
  |
Phaser resume
  |
玩家保持 lastPlayerPosition
```

### 4.3 Phaser 回调注入

Phaser 初始化时由 React 注入回调函数。推荐通过 scene registry 或创建场景时传入配置实现。

```typescript
interface PhaserBridge {
  onEnterProject: (targetType: ActiveView, position: GamePosition) => void;
  getInitialPlayerPosition: () => GamePosition;
}
```

避免在多个组件中重复创建 Phaser 实例。游戏实例应由 `PhaserGameContainer` 统一管理生命周期。

---

## 5. Phaser 场景设计

### 5.1 场景职责

`ForestScene` 负责：

* 加载游戏核心资源。
* 绘制梦幻森林背景与地面。
* 创建玩家角色。
* 创建 4 个 NPC。
* 处理左右移动。
* 处理 NPC 触发范围。
* 显示中文交互提示。
* 触发进入作品页的回调。

`ForestScene` 不负责：

* 渲染作品页 DOM。
* 管理作品数据详情页面。
* 打开外链。
* 渲染 Markdown。

### 5.2 输入控制

支持：

* `A` / `D`。
* `←` / `→`。
* `E`。

进入作品页后，React 负责隐藏 Canvas 并暂停 Phaser。此时游戏输入不应继续响应。

### 5.3 角色动画

MVP 参考素材：

* `figure.png`：正面形象参考，不一定直接用于游戏内移动。
* `stand.png`：侧面站立状态。
* `walk.png`：侧面行走动画参考。

实现建议：

* 玩家空闲时使用侧面站立图。
* 玩家移动时播放行走动画。
* 向左移动时可水平翻转角色。
* NPC 复用同一形象体系，通过服装颜色区分。

### 5.4 地图实现

MVP 阶段地图可先使用代码绘制的简单森林背景与地面，保证风格稳定和加载速度。后续如需要更精细地图，再引入 Tiled 或自定义地图资源。

建议地图参数：

* 单层横轴地图。
* 玩家固定在地面高度移动。
* 摄像机跟随玩家。
* 4 个 NPC 按横向距离依次摆放。
* 背景可使用 2-3 层简单视差元素，但不作为 MVP 阻塞项。

---

## 6. 作品页设计

### 6.1 通用页面行为

四个作品页共用：

* 左上角固定 `← 返回地图` 按钮。
* `ESC` 返回地图。
* 页面内容可滚动。
* 页面中所有可点击元素使用手型光标。
* 外部链接使用新标签页打开。

### 6.2 游戏拆解页

实现需求：

* 从 `projects.json` 读取文章列表。
* 从 Markdown 路径加载正文。
* 左侧展示文章封面和标题。
* 右侧渲染 Markdown 正文。
* Markdown 支持常见排版元素。

MVP 数据：

* `public/articles/pokopia.md`
* `public/articles/pokopia.jpeg`

### 6.3 推送文章页

实现需求：

* 从 `projects.json` 读取推送文章列表。
* 使用网格卡片展示。
* 卡片包含封面、标题和日期。
* 点击卡片新标签页打开链接。

MVP 数据：

* 标题：九月。
* 日期：2024.10.11。
* 封面：`public/articles/September.png`。
* 链接：微信文章 URL。

### 6.4 社媒视频页

实现需求：

* 从 `projects.json` 读取视频列表。
* 展示视频封面和播放按钮。
* 点击封面或按钮新标签页打开视频链接。
* 展示多平台数据面板。

MVP 数据：

* 标题：【旷野之心 x 蝴蝶舞蹈】暖暖，妈妈是野人！
* 封面：`public/videos/nikki.JPEG`。
* 小红书：686 播放、95 赞、16 收藏。
* B 站：188 播放、22 赞、3 收藏。

### 6.5 绘画画廊页

实现需求：

* 从 `projects.json` 读取画廊列表。
* 中央展示大图。
* 展示作品名、时间、工具和简介。
* 底部保留缩略图条。
* 支持左右按钮与键盘 `←` / `→` 切换。
* 当只有 1 张图时，切换按钮禁用。

MVP 数据：

* 作品名：鹿野无料。
* 图片：`public/gallery/luye.png`。
* 简介：无。

---

## 7. 样式与响应式策略

### 7.1 桌面优先

MVP 优先适配 PC 端浏览器。建议基础断点：

* `>= 1024px`：完整游戏体验与双栏作品页。
* `< 1024px`：可显示提示“建议使用电脑浏览”，或提供简化浏览模式。

### 7.2 作品页布局

* 游戏拆解页：桌面双栏布局。
* 推送文章页：响应式网格卡片。
* 视频页：上方封面，下方数据卡片。
* 画廊页：大图优先，缩略图横向滚动。

### 7.3 视觉规范

* 游戏为梦幻森林、温暖手绘风。
* 作品页为简洁现代中文排版。
* 避免过重装饰，优先保证图片、正文和数据清晰可读。

---

## 8. 性能与加载策略

### 8.1 首屏加载

首屏优先加载：

* React 应用基础代码。
* Phaser 核心游戏资源。
* 玩家与 NPC 基础图像。
* 地图基础背景。

### 8.2 延迟加载

以下资源应按需加载：

* Markdown 正文。
* 绘画高清大图。
* 视频封面。
* 推送封面。

进入对应作品页后再加载其内容，减少首屏负担。

### 8.3 静态资源路径

由于目标部署为 Vercel，图片和 Markdown 路径需保证构建后可访问。实现时需统一使用适合构建工具的公共资源目录或导入方式。

---

## 9. 验收标准

### 9.1 游戏验收

* 页面打开后直接进入梦幻森林游戏地图。
* 玩家可以使用 `A/D` 和 `←/→` 左右移动。
* 摄像机随玩家移动。
* 地图上有 4 个 NPC。
* 靠近 NPC 后显示 `!` 和 `[E] 查看作品`。
* 按 `E` 后进入对应作品页。
* 返回地图后玩家位置不重置。

### 9.2 作品页验收

* 游戏拆解页能渲染 `pokopia.md`。
* 推送文章页能展示《九月》卡片，并新标签页打开微信链接。
* 视频页能展示封面、播放按钮和两平台数据，并新标签页打开 B 站链接。
* 绘画页能展示《鹿野无料》大图和简介。
* 四个作品页均可通过 `← 返回地图` 和 `ESC` 返回地图。

### 9.3 部署验收

* Vercel 部署后静态资源路径正常。
* Chrome、Edge、Safari 中基础交互可用。
* 外链点击不会覆盖当前作品集页面。
* 刷新页面不会出现空白或资源 404。

---

## 10. 后续扩展方向

后续可在 MVP 稳定后扩展：

* 接入完整作品数量：5 篇游戏拆解、3 篇推送、2 个视频、10+ 张绘画。
* 使用更精细的森林地图资源、视差背景和角色动画。
* 增加后台数据管理。
* 将 `projects.json` 迁移为 RESTful API。
* 使用 Node.js/Express 或其他后端框架。
* 使用 MongoDB 或 PostgreSQL 存储作品数据。
* 为新增、修改、删除作品接口增加 JWT 鉴权。
* 将绘画大图迁移到对象存储或 CDN。
* 增加移动端简化浏览模式。
