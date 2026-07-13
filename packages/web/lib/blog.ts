import releaseNotes from './release-notes.json'

export type BlogCategory = 'updates' | 'guides' | 'stories'
export type SearchIntent = 'top' | 'middle' | 'bottom'
export type BlogTopic
  = | 'travel-map-animation'
    | 'gps-photo-mapping'
    | 'travel-app-comparison'
    | 'travel-story-map'
    | 'locusify-guides'

export interface BlogPost {
  id: string
  slug: string
  date: string
  category: BlogCategory
  intent: SearchIntent
  targetKeywords: {
    zh: string[]
    en: string[]
  }
  cta: {
    zh: string
    en: string
  }
  title: {
    zh: string
    en: string
  }
  summary: {
    zh: string
    en: string
  }
  content: {
    zh: string[]
    en: string[]
  }
}

interface ReleaseNote {
  version: string
  date: string
  en: string
  zh: string
}

export interface BlogFaqItem {
  question: string
  answer: string
}

export interface BlogLongFormSection {
  heading: string
  paragraphs: string[]
}

export interface BlogVariantSet {
  primary: string
  alternatives: string[]
}

function extractSummary(markdown: string) {
  const line = markdown.split('\n').find(item => item.trim().startsWith('- '))
  if (!line)
    return ''
  return line.trim().slice(2).trim()
}

function extractBody(markdown: string) {
  return markdown
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('# ') && !line.startsWith('> '))
    .map((line) => {
      if (line.startsWith('## '))
        return line.slice(3).trim()
      if (line.startsWith('### '))
        return line.slice(4).trim()
      if (line.startsWith('- '))
        return `• ${line.slice(2).trim()}`
      return line
    })
}

function extractTitle(markdown: string, version: string, locale: 'en' | 'zh') {
  const section = markdown
    .split('\n')
    .find(line => line.trim().startsWith('## '))
    ?.replace(/^##\s+/, '')
    .trim()

  if (!section) {
    return locale === 'zh' ? `${version} 版本更新` : `${version} Release Notes`
  }

  return `${version} · ${section}`
}

function toVersionSlug(version: string) {
  return version.toLowerCase().replace(/\./g, '-')
}

const changelogPosts: BlogPost[] = (releaseNotes as ReleaseNote[]).map(note => ({
  id: note.version,
  slug: toVersionSlug(note.version),
  date: note.date,
  category: 'updates',
  intent: 'bottom',
  targetKeywords: {
    en: ['locusify update', 'locusify changelog', `locusify ${note.version}`],
    zh: ['locusify 更新', 'locusify changelog', `${note.version} 版本`],
  },
  cta: {
    en: 'If the update solves your workflow pain point, test it with your next trip album.',
    zh: '如果这个更新解决了你的流程问题，下一次旅行素材可以直接试用。',
  },
  title: {
    en: extractTitle(note.en, note.version, 'en'),
    zh: extractTitle(note.zh, note.version, 'zh'),
  },
  summary: {
    en: extractSummary(note.en),
    zh: extractSummary(note.zh),
  },
  content: {
    en: extractBody(note.en),
    zh: extractBody(note.zh),
  },
}))

const seoPosts: BlogPost[] = [
  {
    id: 'seo-animated-travel-map',
    slug: 'how-to-create-an-animated-travel-map',
    date: '2026-03-17',
    category: 'guides',
    intent: 'top',
    targetKeywords: {
      en: ['animated travel map', 'how to create travel map', 'travel map animation'],
      zh: ['旅行地图动画', '如何制作旅行地图', '轨迹动画'],
    },
    cta: {
      en: 'Tools like Locusify can automate the map + replay workflow once your photos are ready.',
      zh: '像 Locusify 这样的工具可以在你准备好照片后自动完成地图与回放流程。',
    },
    title: {
      en: 'How to Create an Animated Travel Map (Step-by-Step)',
      zh: '如何制作旅行路线动画地图（分步教程）',
    },
    summary: {
      en: 'A practical workflow from geotagged photos to a shareable animated route replay.',
      zh: '从带 GPS 的照片到可分享路线回放的完整流程。',
    },
    content: {
      en: [
        'Most travelers already have enough material in their photo roll; the bottleneck is turning scattered photos into one coherent route story.',
        'Step 1: collect geotagged photos and remove duplicate bursts from the same location.',
        'Step 2: validate timeline continuity so there are no timezone or clock jumps.',
        'Step 3: render route points on an interactive map and verify obvious outliers.',
        'Step 4: export a short animation that starts with an overview and then zooms into key waypoints.',
        'Tools like Locusify can automate this pipeline and keep all processing on-device for privacy.',
      ],
      zh: [
        '多数旅行者素材足够，真正难点是把零散照片变成一条清晰路线故事。',
        '步骤 1：收集带 GPS 的照片，并删除同地点连拍冗余。',
        '步骤 2：检查时间线连续性，避免时区或设备时间导致跳点。',
        '步骤 3：将坐标渲染到交互地图，先修复异常点再导出。',
        '步骤 4：导出短动画，先总览再展示关键节点。',
        '像 Locusify 这样的工具可以自动化这条流程，并保持本地处理。',
      ],
    },
  },
  {
    id: 'seo-best-apps-visualize-journey',
    slug: 'best-apps-to-visualize-your-travel-journey',
    date: '2026-03-16',
    category: 'stories',
    intent: 'top',
    targetKeywords: {
      en: ['best travel map app', 'visualize travel journey', 'travel route app'],
      zh: ['最佳旅行地图应用', '旅行轨迹可视化', '旅行路线应用'],
    },
    cta: {
      en: 'If privacy and automatic GPS extraction matter, include Locusify in your shortlist.',
      zh: '如果你重视隐私与自动 GPS 提取，可以把 Locusify 纳入候选。',
    },
    title: {
      en: 'Best Apps to Visualize Your Travel Journey in 2026',
      zh: '2026 年最佳旅行轨迹可视化应用推荐',
    },
    summary: {
      en: 'What to compare before choosing a travel map app: import quality, replay output, and privacy model.',
      zh: '选择旅行地图应用前应比较的 3 个核心维度：导入质量、回放效果、隐私模型。',
    },
    content: {
      en: [
        'Most \'best app\' lists are feature dumps; the real comparison should start from your output goal.',
        'If you want short-form social videos, prioritize tools with fast replay export and caption-ready layouts.',
        'If you want long-term memory archives, timeline accuracy and data ownership are more important than effects.',
        'Check whether the tool can read HEIC/JPEG EXIF reliably and handle missing GPS points gracefully.',
        'For privacy-sensitive users, on-device processing is usually a better default than cloud upload pipelines.',
      ],
      zh: [
        '多数“最佳应用”文章只列功能，真正比较应从你的输出目标开始。',
        '如果你要做短视频，优先看回放导出速度和字幕友好布局。',
        '如果你做长期回忆归档，时间线准确性和数据归属更关键。',
        '重点检查工具对 HEIC/JPEG EXIF 的读取稳定性，以及缺失 GPS 的处理方式。',
        '隐私敏感用户通常更适合本地处理模型。',
      ],
    },
  },
  {
    id: 'seo-photos-to-story-map',
    slug: 'how-to-turn-travel-photos-into-a-story-map',
    date: '2026-03-15',
    category: 'guides',
    intent: 'top',
    targetKeywords: {
      en: ['travel story map', 'photos to story map', 'travel storytelling map'],
      zh: ['旅行故事地图', '照片生成故事地图', '地图叙事'],
    },
    cta: {
      en: 'Locusify fits this workflow when you need automatic route reconstruction from photos.',
      zh: '当你需要自动从照片还原路线时，Locusify 很适合这条流程。',
    },
    title: {
      en: 'How to Turn Travel Photos into a Story Map',
      zh: '如何把旅行照片做成故事地图',
    },
    summary: {
      en: 'Use map structure to turn random travel photos into a coherent story sequence.',
      zh: '用地图结构把随机旅行照片转成有叙事的内容序列。',
    },
    content: {
      en: [
        'A story map needs narrative anchors: departure, turning point, climax, and return.',
        'Group photos by location cluster first, then assign each cluster a one-line scene meaning.',
        'Keep transitions short and avoid showing every frame; clarity beats completeness.',
        'Use a map replay between chapters so viewers always know where the story is moving.',
        'Finish with one overview frame to reinforce the entire route memory.',
      ],
      zh: [
        '故事地图需要叙事锚点：出发、转折、高光、返程。',
        '先按地点聚类照片，再为每个聚类写一句场景说明。',
        '过渡要短，不必展示全部素材，清晰比完整更重要。',
        '章节之间用地图回放连接，让观众始终知道故事走向。',
        '结尾补一个总览画面，强化整条路线记忆。',
      ],
    },
  },
  {
    id: 'seo-gps-photo-map-trip',
    slug: 'map-your-trip-using-gps-photos',
    date: '2026-03-14',
    category: 'guides',
    intent: 'middle',
    targetKeywords: {
      en: ['map trip from photos', 'gps photo map', 'geotagged trip route'],
      zh: ['照片生成路线地图', 'GPS 照片地图', '地理标记轨迹'],
    },
    cta: {
      en: 'Locusify can process GPS photos locally and generate route playback without manual pinning.',
      zh: 'Locusify 可以本地处理 GPS 照片并自动生成轨迹回放，无需手动打点。',
    },
    title: {
      en: 'Map Your Trip Using GPS Photos',
      zh: '用 GPS 照片自动绘制你的旅行路线',
    },
    summary: {
      en: 'Extract location metadata from your photo library and convert it into a clean route map.',
      zh: '从照片库提取定位信息并生成清晰旅行路线图。',
    },
    content: {
      en: [
        'Manual map journaling fails at scale, especially after long trips with thousands of photos.',
        'Start with photos that include EXIF latitude and longitude, then sort by timestamp.',
        'Filter out indoor or irrelevant shots that don\'t help route continuity.',
        'Generate route lines in chronological order and verify abnormal long-distance jumps.',
        'Export map plus replay so one asset works for both memory and sharing.',
      ],
      zh: [
        '长途旅行后手动写地图日志几乎不可维护。',
        '先筛出包含 EXIF 经纬度的照片，并按时间排序。',
        '去掉与路线无关的室内或重复镜头，提升连贯性。',
        '按时间顺序连线并检查异常跨城跳点。',
        '最终导出地图与回放，一次生成可留存也可分享的内容。',
      ],
    },
  },
  {
    id: 'seo-travel-map-generator-tools',
    slug: 'travel-map-generator-tools-comparison',
    date: '2026-03-13',
    category: 'stories',
    intent: 'middle',
    targetKeywords: {
      en: ['travel map generator', 'travel route generator', 'map animation tools'],
      zh: ['旅行地图生成器', '路线生成工具', '地图动画工具'],
    },
    cta: {
      en: 'Use Locusify when you need route animation and video export from photo metadata.',
      zh: '如果你需要从照片元数据直接生成路线动画和视频，可优先试 Locusify。',
    },
    title: {
      en: 'Travel Map Generator: Tool Comparison',
      zh: '旅行地图生成器工具对比',
    },
    summary: {
      en: 'A framework to evaluate route generation tools by data quality, speed, and output style.',
      zh: '按数据质量、处理效率、输出风格对路线生成工具进行评估。',
    },
    content: {
      en: [
        'The right map generator depends on whether your source is photos, GPX tracks, or manual notes.',
        'Photo-first creators should prioritize EXIF parsing reliability and deduplication controls.',
        'If your channel is short-form video, animation smoothness and export presets matter most.',
        'For long-term trip archives, editable route corrections and stable timeline handling are critical.',
        'Evaluate tools with the same dataset, not marketing demos, before committing.',
      ],
      zh: [
        '地图生成器是否好用，取决于你的输入是照片、GPX 还是手动记录。',
        '照片驱动用户应优先看 EXIF 解析稳定性与去重能力。',
        '短视频创作者更应关注动画流畅度与导出预设。',
        '长期归档用户要重点看路线修正能力和时间线稳定性。',
        '务必用同一套素材横向测试，而不是只看官方演示。',
      ],
    },
  },
  {
    id: 'seo-polarsteps-alternative',
    slug: 'best-polarsteps-alternative-for-photo-route-replay',
    date: '2026-03-12',
    category: 'stories',
    intent: 'bottom',
    targetKeywords: {
      en: ['Polarsteps alternative', 'apps like polarsteps', 'travel route replay app'],
      zh: ['Polarsteps 替代', '类似 polarsteps 的应用', '旅行路线回放应用'],
    },
    cta: {
      en: 'If you prefer on-device processing and quick video output, test Locusify on a recent trip album.',
      zh: '如果你更偏好本地处理和快速视频输出，可用最近一次旅行素材测试 Locusify。',
    },
    title: {
      en: 'Best Polarsteps Alternative for Photo Route Replay',
      zh: 'Polarsteps 替代方案：照片路线回放工具怎么选',
    },
    summary: {
      en: 'Choose an alternative based on data control, automation level, and replay export quality.',
      zh: '按数据控制权、自动化程度和回放导出质量选择替代方案。',
    },
    content: {
      en: [
        'Users usually switch when they need either more control or less manual editing.',
        'Compare how each app handles geotagged photos, missing points, and timeline corrections.',
        'For social creators, check whether export is optimized for vertical short-form videos.',
        'For privacy-focused users, verify where photo metadata is processed and stored.',
        'Run a side-by-side test with one real trip before migration.',
      ],
      zh: [
        '用户更换工具通常因为需要更强控制，或希望减少手工编辑。',
        '重点比较各应用对地理标记照片、缺失点和时间线修正的处理。',
        '短视频创作者应关注竖屏导出效率和节奏表现。',
        '隐私敏感用户需确认照片元数据在哪里处理与存储。',
        '迁移前先用一次真实旅行素材做并行测试。',
      ],
    },
  },
  {
    id: 'seo-google-timeline-vs-apps',
    slug: 'google-timeline-vs-travel-apps',
    date: '2026-03-11',
    category: 'stories',
    intent: 'bottom',
    targetKeywords: {
      en: ['Google Timeline vs', 'travel tracking apps', 'travel route visualization app'],
      zh: ['Google Timeline 对比', '旅行追踪应用', '旅行路线可视化应用'],
    },
    cta: {
      en: 'Locusify is a stronger fit when your primary source is travel photos rather than continuous GPS logs.',
      zh: '如果你的核心素材是旅行照片而非持续 GPS 轨迹，Locusify 更匹配。',
    },
    title: {
      en: 'Google Timeline vs Travel Apps: Which Is Better for Trip Visualization?',
      zh: 'Google Timeline vs 旅行应用：哪种更适合轨迹可视化？',
    },
    summary: {
      en: 'A decision guide between passive location history and photo-driven travel storytelling tools.',
      zh: '在被动定位历史与照片驱动叙事工具之间做选择的决策指南。',
    },
    content: {
      en: [
        'Google Timeline is good for passive history, but not designed for storytelling output.',
        'Travel apps add structure: waypoint control, replay pacing, and export formats.',
        'If you care about narrative quality, you need chapter-like segments and visual emphasis on key stops.',
        'If you care about raw trace logs, passive tracking may already be enough.',
        'Pick based on your final use case: archive logs, or publishable story maps.',
      ],
      zh: [
        'Google Timeline 适合被动记录历史，但并非为内容输出设计。',
        '旅行应用提供更完整结构：节点控制、回放节奏、可发布导出。',
        '如果你重视叙事效果，需要章节化分段和关键节点强调。',
        '如果你只要原始轨迹日志，被动追踪已足够。',
        '选择标准应是最终用途：日志归档，还是可发布故事地图。',
      ],
    },
  },
  {
    id: 'seo-best-travel-tracking-apps-2026',
    slug: 'best-travel-tracking-apps-2026',
    date: '2026-03-10',
    category: 'stories',
    intent: 'top',
    targetKeywords: {
      en: ['best travel tracking apps 2026', 'trip tracker app', 'travel route tracker'],
      zh: ['2026 最佳旅行追踪应用', '行程追踪应用', '旅行路线追踪'],
    },
    cta: {
      en: 'If your workflow starts from photos and ends with shareable route videos, include Locusify in your evaluation.',
      zh: '如果你的流程从照片开始并以可分享路线视频结束，可优先评估 Locusify。',
    },
    title: {
      en: 'Best Travel Tracking Apps in 2026',
      zh: '2026 年最佳旅行追踪应用',
    },
    summary: {
      en: 'How to choose a trip tracker that supports both memory archive and content publishing.',
      zh: '如何选择同时适用于回忆留存与内容发布的行程追踪工具。',
    },
    content: {
      en: [
        'The strongest tracking apps are not always the ones with the most features, but the least friction in daily use.',
        'Evaluate import options: photo EXIF, GPX, and manual pins should complement each other.',
        'Check replay quality on both desktop and mobile if social distribution is part of your plan.',
        'Data ownership and export flexibility matter for long-term archives.',
        'A one-week trial with your real workflow is the fastest validation method.',
      ],
      zh: [
        '真正好用的追踪应用不是功能最多，而是日常使用阻力最小。',
        '导入能力要看组合：照片 EXIF、GPX、手动打点是否互补。',
        '如果你要做社交分发，要检查桌面和移动端的回放表现。',
        '长期使用要重视数据归属和导出灵活性。',
        '用真实流程跑一周，是最快的验证方式。',
      ],
    },
  },
  {
    id: 'seo-visualize-route-iphone',
    slug: 'visualize-travel-route-from-iphone-photos',
    date: '2026-03-09',
    category: 'guides',
    intent: 'middle',
    targetKeywords: {
      en: ['iphone photos travel map', 'visualize route from iphone photos', 'heic gps map'],
      zh: ['iPhone 照片旅行地图', 'iPhone 照片轨迹可视化', 'HEIC GPS 地图'],
    },
    cta: {
      en: 'Locusify supports HEIC/JPEG workflows and can directly turn iPhone trip photos into route replays.',
      zh: 'Locusify 支持 HEIC/JPEG 流程，可直接把 iPhone 旅行照片转成路线回放。',
    },
    title: {
      en: 'Visualize Travel Route from iPhone Photos',
      zh: '如何从 iPhone 照片可视化旅行路线',
    },
    summary: {
      en: 'A practical HEIC-first workflow for turning iPhone travel photos into an accurate route map.',
      zh: '面向 HEIC 素材的实操流程：把 iPhone 旅行照片转成准确路线图。',
    },
    content: {
      en: [
        'iPhone photos often contain high-quality location metadata, but mixed exports can break continuity.',
        'Keep original files when possible; edited social copies may strip EXIF data.',
        'Sort by capture time, then check for timezone shifts after international flights.',
        'Use clustering to reduce noisy repeated shots at one point of interest.',
        'Export a concise replay version first, then create longer archive cuts if needed.',
      ],
      zh: [
        'iPhone 照片通常定位信息很完整，但多次转存会破坏连续性。',
        '尽量保留原图，社交平台二次导出版本可能丢失 EXIF。',
        '按拍摄时间排序，并在跨国旅行后检查时区偏移。',
        '用聚类降低同一景点重复镜头造成的噪声。',
        '先导出精简回放版本，再按需制作长版本归档。',
      ],
    },
  },
  {
    id: 'seo-map-animation-video',
    slug: 'create-travel-animation-video-from-map',
    date: '2026-03-08',
    category: 'guides',
    intent: 'middle',
    targetKeywords: {
      en: ['travel animation video', 'map animation video', 'create travel route video'],
      zh: ['旅行动画视频', '地图动画视频', '旅行路线视频'],
    },
    cta: {
      en: 'Locusify helps you generate map-based travel videos quickly without manual keyframing.',
      zh: 'Locusify 能在无需手动关键帧的情况下快速生成地图旅行视频。',
    },
    title: {
      en: 'Create a Travel Animation Video from Your Map',
      zh: '如何从地图生成旅行动画视频',
    },
    summary: {
      en: 'Convert route data and travel photos into a map animation video optimized for sharing.',
      zh: '将路线数据与旅行照片转为适合分享的地图动画视频。',
    },
    content: {
      en: [
        'A map animation video works when viewers can understand both movement and moments in seconds.',
        'Set an opening frame with total route overview to establish geographic context.',
        'Alternate between moving map segments and key photo highlights to keep pace balanced.',
        'Keep runtime under one minute for social-first distribution, unless it is a documentary cut.',
        'Export in target aspect ratio first to avoid post-edit crop losses.',
      ],
      zh: [
        '地图动画视频有效的前提是观众能快速看懂“移动”和“事件”。',
        '开场先给总路线总览，建立地理上下文。',
        '在地图移动段与关键照片段之间交替，保持节奏平衡。',
        '社交分发优先控制在 1 分钟以内，纪录片型内容除外。',
        '先按目标画幅导出，避免后期裁切损失关键信息。',
      ],
    },
  },
  {
    id: 'seo-locusify-vs-polarsteps',
    slug: 'locusify-vs-polarsteps',
    date: '2026-03-07',
    category: 'stories',
    intent: 'bottom',
    targetKeywords: {
      en: ['locusify vs polarsteps', 'polarsteps alternative', 'travel map app comparison'],
      zh: ['locusify vs polarsteps', 'polarsteps 替代', '旅行地图应用对比'],
    },
    cta: {
      en: 'If you want photo-first automation and faster replay exports, run a side-by-side test with Locusify.',
      zh: '如果你想要照片优先自动化和更快回放导出，建议用同一素材对比测试 Locusify。',
    },
    title: {
      en: 'Locusify vs Polarsteps: Which Travel Map Workflow Fits You?',
      zh: 'Locusify vs Polarsteps：哪种旅行地图流程更适合你？',
    },
    summary: {
      en: 'A practical comparison of setup cost, photo-to-route automation, and social-ready replay output.',
      zh: '从上手成本、照片到路线自动化、社交导出能力三方面做实用对比。',
    },
    content: {
      en: [
        'The core difference is workflow philosophy: timeline journaling first vs photo-to-route automation first.',
        'If your source of truth is a photo library, automatic EXIF extraction usually reduces manual work.',
        'If your priority is travel journaling while moving, timeline-centric tools may feel more natural.',
        'For creators, export speed and vertical video readiness can be the deciding factors.',
        'Use one real trip album for A/B testing before committing to a long-term workflow.',
      ],
      zh: [
        '两者核心差异在流程理念：时间线日志优先，还是照片到路线自动化优先。',
        '如果你的素材中心是照片库，自动 EXIF 提取通常能显著减少手工工作。',
        '如果你更重视旅途中持续记录，时间线型工具会更自然。',
        '对创作者来说，导出速度和竖屏视频适配往往是关键决策点。',
        '建议用一次真实旅行素材做 A/B 测试后再决定长期方案。',
      ],
    },
  },
  {
    id: 'seo-locusify-vs-google-timeline',
    slug: 'locusify-vs-google-timeline',
    date: '2026-03-06',
    category: 'stories',
    intent: 'bottom',
    targetKeywords: {
      en: ['locusify vs google timeline', 'google timeline alternative', 'trip visualization app'],
      zh: ['locusify vs google timeline', 'google timeline 替代', '行程可视化应用'],
    },
    cta: {
      en: 'For photo-driven trip storytelling, Locusify gives you stronger replay and export control.',
      zh: '如果你做照片驱动的行程叙事，Locusify 在回放和导出控制上更有优势。',
    },
    title: {
      en: 'Locusify vs Google Timeline for Trip Visualization',
      zh: 'Locusify 与 Google Timeline：行程可视化对比',
    },
    summary: {
      en: 'When to use passive location history and when to switch to photo-driven storytelling workflows.',
      zh: '什么时候适合被动定位历史，什么时候该切到照片驱动叙事流程。',
    },
    content: {
      en: [
        'Google Timeline is effective for passive movement history, but limited for publishable visual storytelling.',
        'Photo-driven tools focus on route replay quality, chapter control, and export-ready formats.',
        'If you want to share content, map animation and pacing controls matter more than raw logs.',
        'If you only need personal trace history, passive tracking may already be sufficient.',
        'Decide based on end output: memory log, or story map/video.',
      ],
      zh: [
        'Google Timeline 擅长被动移动历史记录，但在可发布叙事内容上能力有限。',
        '照片驱动工具更重视回放质量、章节控制和可导出格式。',
        '如果你需要分享内容，地图动画与节奏控制比原始日志更重要。',
        '如果你只看个人轨迹记录，被动追踪本身可能已经足够。',
        '最终应按产出目标决策：轨迹日志，还是故事地图/视频。',
      ],
    },
  },
  {
    id: 'seo-locusify-tutorial-beginners',
    slug: 'locusify-tutorial-for-beginners',
    date: '2026-03-05',
    category: 'guides',
    intent: 'bottom',
    targetKeywords: {
      en: ['locusify tutorial', 'how to use locusify', 'locusify guide'],
      zh: ['locusify 教程', '如何使用 locusify', 'locusify 入门指南'],
    },
    cta: {
      en: 'Start with one recent trip folder and finish your first map replay in under 10 minutes.',
      zh: '从最近一次旅行文件夹开始，10 分钟内完成你的首个地图回放。',
    },
    title: {
      en: 'Locusify Tutorial for Beginners: First Travel Map in 10 Minutes',
      zh: 'Locusify 新手教程：10 分钟做出第一条旅行地图',
    },
    summary: {
      en: 'A beginner workflow for importing geotagged photos, cleaning route noise, and exporting your first replay.',
      zh: '面向新手的完整流程：导入定位照片、清理轨迹噪声、导出第一条回放。',
    },
    content: {
      en: [
        'Prepare one folder of geotagged photos from a single trip to keep your first run simple.',
        'Import photos, verify timeline order, and remove obvious duplicate bursts at the same location.',
        'Scan the route map for outlier jumps and fix them before starting replay generation.',
        'Choose a short replay duration and export in your target aspect ratio first.',
        'After your first output, iterate with style templates and caption layers.',
      ],
      zh: [
        '首轮建议只用一次旅行的定位照片文件夹，降低复杂度。',
        '导入后先校验时间顺序，再删除同地点明显重复连拍。',
        '生成回放前先巡检地图，修复异常跳点。',
        '先按目标平台画幅导出短版本，再做长版本迭代。',
        '完成第一版后，再逐步叠加模板风格和文案层。',
      ],
    },
  },
]

const legacyCuratedPosts: BlogPost[] = [
  {
    id: 'guide-gps-photo-quality',
    slug: 'gps-photo-quality-checklist',
    date: '2026-03-01',
    category: 'guides',
    intent: 'middle',
    targetKeywords: {
      zh: ['GPS 照片质量', '轨迹准确度', '旅行照片清单'],
      en: ['gps photo quality', 'travel map accuracy', 'geotag photo checklist'],
    },
    cta: {
      zh: '完成这份清单后，再把素材导入 Locusify 生成地图与回放，会更稳定。',
      en: 'After this checklist, import your assets into Locusify for a cleaner map and replay result.',
    },
    title: {
      zh: 'GPS 照片质量清单：导入前先做这 7 件事',
      en: 'GPS photo quality checklist: 7 things before import',
    },
    summary: {
      zh: '通过一个可执行清单，提高轨迹准确度和回放观感，减少后期返工。',
      en: 'A practical checklist to improve route accuracy and replay quality before processing.',
    },
    content: {
      zh: [
        '先检查照片是否包含有效 GPS 信息。没有坐标的照片会影响路线连续性，建议单独分组处理。',
        '统一照片时间轴非常关键。跨时区旅行时，请先确认设备时间与时区设置是否正确。',
        '优先保留关键节点照片：出发点、转折点、目的地。它们决定了回放叙事是否清晰。',
        '避免同一地点的过密连拍全部参与轨迹计算，可先做去重或抽样，提升可读性。',
        '导出前先在地图上做一次快速巡检，确认异常跳点并手动修正。',
      ],
      en: [
        'Start by checking whether photos contain valid GPS metadata. Non-geotagged photos should be grouped separately.',
        'Time consistency is critical. For cross-timezone trips, verify device time and timezone first.',
        'Keep key waypoints: departure, major turns, and destination. They shape the replay narrative.',
        'Avoid feeding dense burst shots from the same spot into route calculation; sample them first.',
        'Before export, do a quick map pass to catch and fix obvious outlier points.',
      ],
    },
  },
  {
    id: 'story-backpacker-europe',
    slug: 'story-europe-backpacking-route',
    date: '2026-02-10',
    category: 'stories',
    intent: 'middle',
    targetKeywords: {
      zh: ['欧洲背包路线', '旅行地图案例', '路线回放案例'],
      en: ['europe backpacking route', 'travel map case study', 'route replay example'],
    },
    cta: {
      zh: '类似多国多城市素材，可以直接按交通方式在 Locusify 里拆段生成。',
      en: 'For multi-country trips, segment by transport mode in Locusify to keep the replay clear.',
    },
    title: {
      zh: '案例：20 天欧洲背包路线如何做成一条清晰视频',
      en: 'Case study: turning a 20-day Europe route into a clear video',
    },
    summary: {
      zh: '从混乱素材到结构化回放，关键在于路线分段和节点叙事。',
      en: 'A real workflow from messy assets to a structured replay narrative.',
    },
    content: {
      zh: [
        '这位用户的素材跨 6 个国家、2000+ 张照片，最初问题是节奏过慢、信息堆积。',
        '我们先按交通方式切分路段，再用“城市抵达点”做章节锚点，视频结构立刻清晰。',
        '最终版本把时长从 3 分钟压到 58 秒，完播率显著提升。',
      ],
      en: [
        'The creator had 2000+ photos across 6 countries, with pacing and information overload issues.',
        'Segmenting by transport mode and using city arrivals as chapter anchors made the narrative much clearer.',
        'The final cut went from 3 minutes to 58 seconds with significantly better completion.',
      ],
    },
  },
]

const allPosts: BlogPost[] = [...changelogPosts, ...seoPosts, ...legacyCuratedPosts]
  .sort((a, b) => b.date.localeCompare(a.date))

export function getAllBlogPosts() {
  return allPosts
}

export function getBlogPostBySlug(slug: string) {
  const normalized = slug.toLowerCase()
  return allPosts.find((post) => {
    const dotVersion = post.id.toLowerCase()
    return post.slug === normalized || dotVersion === normalized
  })
}

export function getRelatedBlogPosts(post: BlogPost, limit = 3) {
  return allPosts
    .filter(candidate => candidate.slug !== post.slug)
    .sort((a, b) => {
      if (a.intent === post.intent && b.intent !== post.intent)
        return -1
      if (a.intent !== post.intent && b.intent === post.intent)
        return 1
      if (a.category === post.category && b.category !== post.category)
        return -1
      if (a.category !== post.category && b.category === post.category)
        return 1
      return b.date.localeCompare(a.date)
    })
    .slice(0, limit)
}

export function getTopicLabel(topic: BlogTopic, locale: 'zh' | 'en') {
  const labels: Record<BlogTopic, { zh: string, en: string }> = {
    'travel-map-animation': {
      en: 'Travel Map Animation',
      zh: '旅行地图动画',
    },
    'gps-photo-mapping': {
      en: 'GPS Photo Mapping',
      zh: 'GPS 照片地图',
    },
    'travel-app-comparison': {
      en: 'Travel App Comparison',
      zh: '旅行应用对比',
    },
    'travel-story-map': {
      en: 'Travel Story Map',
      zh: '旅行故事地图',
    },
    'locusify-guides': {
      en: 'Locusify Guides',
      zh: 'Locusify 教程',
    },
  }

  return labels[topic][locale]
}

function inferTopicsForPost(post: BlogPost): BlogTopic[] {
  const slug = post.slug.toLowerCase()
  const combined = [
    ...post.targetKeywords.en,
    ...post.targetKeywords.zh,
    post.title.en,
    post.title.zh,
  ]
    .join(' ')
    .toLowerCase()

  const topics: BlogTopic[] = []

  if (
    slug.includes('animation')
    || slug.includes('animated')
    || slug.includes('replay')
    || combined.includes('animation')
  ) {
    topics.push('travel-map-animation')
  }

  if (
    slug.includes('gps')
    || slug.includes('photo')
    || slug.includes('iphone')
    || combined.includes('gps')
    || combined.includes('exif')
  ) {
    topics.push('gps-photo-mapping')
  }

  if (
    slug.includes('vs-')
    || slug.includes('alternative')
    || slug.includes('comparison')
    || combined.includes('alternative')
    || combined.includes('对比')
  ) {
    topics.push('travel-app-comparison')
  }

  if (
    slug.includes('story')
    || slug.includes('journey')
    || combined.includes('story map')
    || combined.includes('故事地图')
  ) {
    topics.push('travel-story-map')
  }

  if (slug.includes('locusify') || combined.includes('locusify')) {
    topics.push('locusify-guides')
  }

  if (topics.length === 0) {
    topics.push('travel-story-map')
  }

  return [...new Set(topics)]
}

export function getAllBlogTopics(): BlogTopic[] {
  const topics = new Set<BlogTopic>()
  for (const post of allPosts) {
    for (const topic of inferTopicsForPost(post)) {
      topics.add(topic)
    }
  }
  return Array.from(topics)
}

export function getBlogPostsByTopic(topic: BlogTopic) {
  return allPosts.filter(post => inferTopicsForPost(post).includes(topic))
}

export function getEstimatedReadMinutes(post: BlogPost, locale: 'zh' | 'en') {
  const longFormSections = getBlogLongFormSections(post, locale)
  const longFormText = longFormSections
    .flatMap(section => [section.heading, ...section.paragraphs])
    .join(' ')
  const text
    = locale === 'zh'
      ? [post.title.zh, post.summary.zh, ...post.content.zh, longFormText].join(' ')
      : [post.title.en, post.summary.en, ...post.content.en, longFormText].join(' ')
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 220))
}

export function getBlogPostFaq(post: BlogPost, locale: 'zh' | 'en'): BlogFaqItem[] {
  const keywords = locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en
  const primaryKeyword = keywords[0] ?? (locale === 'zh' ? '旅行地图' : 'travel map')

  if (locale === 'zh') {
    return [
      {
        question: `什么是“${primaryKeyword}”最实用的开始方式？`,
        answer:
          '先用一段最近旅行素材跑通完整流程：导入照片、校验时间线、修复异常点、导出短版本。先完成，再优化。',
      },
      {
        question: '如果照片里有缺失 GPS 信息怎么办？',
        answer:
          '可以先按有坐标素材生成主路线，再把无坐标照片作为补充素材放在章节节点，不要强行参与轨迹连线。',
      },
      {
        question: '如何让输出内容更适合社交平台传播？',
        answer:
          '优先短时长和清晰节奏：开场总览、关键节点、结尾收束，同时按目标平台画幅导出，减少二次裁切损耗。',
      },
      {
        question: 'Locusify 在这个流程里适合什么场景？',
        answer: post.cta.zh,
      },
    ]
  }

  return [
    {
      question: `What is the fastest way to start with ${primaryKeyword}?`,
      answer:
        'Use one recent trip folder and run the full flow once: import, timeline check, outlier cleanup, and short replay export.',
    },
    {
      question: 'What if some photos do not contain GPS metadata?',
      answer:
        'Build the core route from geotagged photos first, then place non-geotagged images as chapter visuals instead of route points.',
    },
    {
      question: 'How do I make outputs more shareable on social channels?',
      answer:
        'Keep runtime concise, start with route overview, highlight key stops, and export directly in the target aspect ratio.',
    },
    {
      question: 'Where does Locusify fit in this workflow?',
      answer: post.cta.en,
    },
  ]
}

export function getBlogLongFormSections(post: BlogPost, locale: 'zh' | 'en'): BlogLongFormSection[] {
  const keywords = locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en
  const primaryKeyword = keywords[0] ?? (locale === 'zh' ? '旅行地图' : 'travel map')
  const secondaryKeyword = keywords[1] ?? (locale === 'zh' ? '旅行轨迹可视化' : 'trip visualization')
  const summary = locale === 'zh' ? post.summary.zh : post.summary.en
  const content = locale === 'zh' ? post.content.zh : post.content.en
  const painPoint = content[0] ?? summary
  const workflow = content.slice(1, 4)
  const intent = post.intent

  if (locale === 'zh') {
    if (intent === 'top') {
      return [
        {
          heading: '为什么用户会搜索这个关键词',
          paragraphs: [
            `“${primaryKeyword}”属于典型的探索型关键词，用户多数还在找方法，而不是马上选工具。此时内容目标不是卖点堆砌，而是降低理解门槛，让用户快速看到可执行路径。`,
            `在 Top 阶段，文章应优先回答“我该从哪里开始”，并用一个低风险流程让用户在短时间获得第一个正反馈。`,
            `你的摘要已经给出方向：${summary}。接下来所有章节都要围绕“让新手先跑通”这个核心目标展开。`,
          ],
        },
        {
          heading: '从 0 到 1 的最小闭环',
          paragraphs: [
            `先选一次单独旅行素材做演练，不要混入多次行程。素材范围越小，学习成本越低，结果也更可控。`,
            `按主流程执行：${workflow.join(' ')}。目标是做出可用版本，而不是一次做成终版。`,
            `完成首版后，再补节奏、字幕、画幅等发布优化。这种“先跑通再优化”的顺序对新用户成功率最高。`,
          ],
        },
        {
          heading: '内容分发建议（Top 流量）',
          paragraphs: [
            `Top 内容适合做“教程型 + 清单型”双版本。教程解决“怎么做”，清单解决“怕漏做”。两者组合更容易拿到搜索点击。`,
            `标题要明确动作与结果，例如“如何制作”“一步步完成”，避免抽象命名。首屏要在 20 秒内给读者看到产出预期。`,
            `把工具描述放进步骤语句里而不是广告句里，平台与用户都更容易接受。`,
          ],
        },
      ]
    }

    if (intent === 'middle') {
      return [
        {
          heading: '问题定位：用户已经有需求，但卡在执行细节',
          paragraphs: [
            `Middle 关键词用户通常已经知道要做什么，卡点在于流程不稳、结果不一致或发布效果不理想。`,
            `这类文章要把“原理解释”缩短，把“排错与参数建议”放大，帮助用户减少返工。`,
            `当前内容中的核心痛点是：${painPoint}。你需要围绕这个问题给清晰可复用的修正动作。`,
          ],
        },
        {
          heading: '稳定产出的执行框架',
          paragraphs: [
            `建议把流程分成三层：输入质量、路径修正、输出发布。先修输入，再修路径，最后调输出。`,
            `可直接执行的主链路：${workflow.join(' ')}。每一步都设一个“完成标准”，避免只凭感觉判断是否可发布。`,
            `当结果不稳定时，优先回查时间线与异常跳点，通常比调视觉参数更有效。`,
          ],
        },
        {
          heading: '转化强化（Middle 到 Bottom）',
          paragraphs: [
            `Middle 阶段最有效的转化方式是“对比前后效率差异”，例如手工流程耗时 vs 自动流程耗时。`,
            `在文末给出具体下一步：用最近一组素材复现流程并记录耗时，再决定是否长期采用。`,
            `这类内容可以自然承接到对比页和品牌词页，为 Bottom 转化做铺垫。`,
          ],
        },
      ]
    }

    if (intent === 'bottom') {
      return [
        {
          heading: '决策阶段关注点：可信度、迁移成本、结果确定性',
          paragraphs: [
            `Bottom 阶段用户已经在比较方案，真正关心的是“值不值得切换”和“能不能稳定产出”。`,
            `这时文章应聚焦决策维度：上手时间、替换成本、结果可控性，而不是泛泛功能列表。`,
            `围绕关键词“${primaryKeyword}”应明确你的差异化判断标准，帮助读者快速做选择。`,
          ],
        },
        {
          heading: '比较框架与验证方法',
          paragraphs: [
            `建议用同一份真实素材进行并行测试，并记录三项指标：完成时间、修正次数、最终可发布质量。`,
            `可参考主流程：${workflow.join(' ')}。如果对比文章只停留在主观体验，转化说服力会很弱。`,
            `把结论写成“适用人群 + 场景边界”，而不是绝对优劣，更容易建立信任。`,
          ],
        },
        {
          heading: 'Bottom 转化动作',
          paragraphs: [
            `文末要给明确动作：下载试跑、导入真实素材、导出首个版本。动作越具体，决策推进越快。`,
            `同时保留风险说明与替代路径，能降低用户的心理防御，反而提升实际转化。`,
            `对于品牌词内容，相关文章应优先链接教程页与案例页，形成“比较 -> 试用 -> 复盘”的闭环。`,
          ],
        },
      ]
    }

    return [
      {
        heading: '搜索意图与内容目标',
        paragraphs: [
          `这篇内容的核心关键词是“${primaryKeyword}”，次级关键词是“${secondaryKeyword}”。要真正拿到搜索流量，文章不能停留在功能介绍，而要直接回应用户搜索背后的任务目标。用户点进来通常不是想了解产品历史，而是想知道“我现在怎么做，才能更快得到结果”。`,
          `因此正文需要围绕“问题 -> 方法 -> 结果”展开。先明确当前阻力，再给可执行流程，最后给到能立即验证的输出方式。对于这类旅行内容，最有效的路径通常是先做一个小版本跑通，再迭代优化。`,
          `当前文章摘要已经定义了目标方向：${summary}。后续段落要持续回到这个结果，避免被功能细节带偏。`,
        ],
      },
      {
        heading: '执行流程（可直接照做）',
        paragraphs: [
          `先完成一次低成本素材准备：只选最近一次旅行的照片，保证时间线尽量连续。素材越统一，后续路线越稳定，也更容易定位问题。很多人第一步就把多年素材混在一起，导致噪声过高，反而看不清路径。`,
          `接着执行主流程：${workflow.join(' ')}。这一步建议先做“可用版本”，不要一开始追求完美风格。能导出、能看懂、能分享，才是第一阶段目标。`,
          `完成首版后，再补节奏优化和视觉表达。比如先给路线总览，再展示关键节点，最后用收束画面结束。这样观众更容易在短时间理解你的旅程脉络。`,
        ],
      },
      {
        heading: '常见错误与修正方法',
        paragraphs: [
          `最常见的问题是把“素材堆叠”误当成“内容完成”。如果你只是把所有照片按时间输出，结果通常冗长、无重点、跳点明显。这个痛点在当前文章也已经提到：${painPoint}。`,
          `修正时优先做三件事：第一，删除重复视角；第二，保留关键转折节点；第三，检查异常跨城跳点。只要这三件事做对，路线可读性会明显提升。`,
          `另一个高频错误是导出尺寸和发布平台不匹配。建议发布前就按目标平台画幅导出，避免二次裁切破坏地图信息和字幕安全区。`,
        ],
      },
      {
        heading: '分发与转化清单',
        paragraphs: [
          `内容完成后不要只发布一次。把同一条主路线拆成“教程版、对比版、案例版”三个角度，能覆盖更多搜索入口和社交受众。教程版承接泛流量，对比版承接竞品词，案例版提升可信度。`,
          `每次发布都要附上明确动作：让读者知道下一步做什么。比如“用最近一次旅行素材跑一遍流程，再回头优化风格”。可执行动作越具体，转化率越高。`,
          `自然嵌入产品时，优先用场景语言而不是广告语言。把工具放进解决方案链路里，而不是单独喊口号，这样既更像内容，也更容易被平台和用户接受。`,
        ],
      },
      {
        heading: '落地建议（接下来 7 天）',
        paragraphs: [
          `第 1-2 天：按本文流程完成首版并导出。第 3-4 天：根据反馈修正节点与节奏。第 5 天：发布对比向和教程向两个衍生版本。第 6-7 天：根据搜索词和完读数据回改标题与首段。`,
          `如果你希望持续增长，把同类关键词文章串成专题集群页，再通过相关文章模块互相导流。这样每一篇都不是孤立页面，而是搜索网络中的节点，长期累积效果更稳。`,
          `在这个过程中，像 Locusify 这样的工具价值在于缩短“素材 -> 地图 -> 回放 -> 导出”的链路时间，让你把更多精力放在叙事和分发，而不是重复手工处理。`,
        ],
      },
    ]
  }

  if (intent === 'top') {
    return [
      {
        heading: 'Why People Search This Keyword',
        paragraphs: [
          `"${primaryKeyword}" is usually a discovery-stage query. Readers are exploring approaches, not selecting a final tool yet. Your goal here is clarity and momentum, not feature depth.`,
          `Top-funnel content should answer one question first: where do I start right now? If the reader can complete one small output quickly, trust increases naturally.`,
          `The current summary defines your target outcome clearly: ${summary}. Keep each section aligned with first-result success.`,
        ],
      },
      {
        heading: 'The 0-to-1 Starter Workflow',
        paragraphs: [
          `Use one recent trip dataset only. Narrow scope reduces noise and improves execution speed for first-time users.`,
          `Run the core chain: ${workflow.join(' ')}. Prioritize a usable draft over a perfect version.`,
          `After first export, optimize pacing and delivery format. Sequencing matters: completion first, polish second.`,
        ],
      },
      {
        heading: 'Top-Funnel Distribution Pattern',
        paragraphs: [
          `Package this article into tutorial + checklist formats. Tutorials attract intent traffic; checklists improve save/share behavior.`,
          `Headline and intro should be action-led and outcome-specific. Readers should understand expected output in seconds.`,
          `Embed product naturally inside workflow language, not promotional slogans, to keep trust and retention high.`,
        ],
      },
    ]
  }

  if (intent === 'middle') {
    return [
      {
        heading: 'Problem Framing for Middle-Funnel Readers',
        paragraphs: [
          `Middle-funnel readers usually know what they want but struggle with consistency: unstable routes, cleanup overhead, or weak publishing output.`,
          `This stage needs practical troubleshooting and decision criteria more than concept explanation.`,
          `Your primary pain signal is already present: ${painPoint}. Build the section around repeatable fixes.`,
        ],
      },
      {
        heading: 'Reliable Production Framework',
        paragraphs: [
          `Split execution into three layers: input quality, route correction, and output packaging. Fix in that order to avoid wasted effort.`,
          `Use this core sequence: ${workflow.join(' ')}. Define completion checks for each step to remove ambiguity.`,
          `When output quality drops, debug timeline continuity and outlier jumps before visual styling adjustments.`,
        ],
      },
      {
        heading: 'Conversion Bridge to Bottom Funnel',
        paragraphs: [
          `The strongest middle-funnel conversion trigger is measurable efficiency gain: time spent, edits required, and publish readiness.`,
          `Give readers one concrete next step: run the same workflow on a recent trip and compare effort against their current process.`,
          `Link this content to comparison and brand-intent pages to create a smooth transition into decision-stage content.`,
        ],
      },
    ]
  }

  if (intent === 'bottom') {
    return [
      {
        heading: 'Decision Criteria at Bottom Funnel',
        paragraphs: [
          `Bottom-funnel readers are evaluating confidence, switching cost, and output predictability. Generic feature lists are rarely enough.`,
          `Content should prioritize decision dimensions: onboarding time, migration friction, and quality consistency.`,
          `For "${primaryKeyword}", define clear evaluation criteria so readers can choose quickly based on their workflow reality.`,
        ],
      },
      {
        heading: 'Comparison Method That Builds Trust',
        paragraphs: [
          `Use one real dataset across tools and compare three metrics: completion time, correction workload, and final publish quality.`,
          `A practical baseline flow remains: ${workflow.join(' ')}. Keep claims tied to observable process outcomes.`,
          `Write conclusions as fit-by-scenario, not absolute winner claims. This increases credibility and conversion quality.`,
        ],
      },
      {
        heading: 'Bottom-Funnel Conversion Actions',
        paragraphs: [
          `End with explicit actions: test run, import real assets, export first version. Concrete actions move decisions forward.`,
          `Include risk notes and fallback paths. Balanced framing often converts better than aggressive claims.`,
          `Interlink to tutorial and case-study pages to complete the comparison -> trial -> validation loop.`,
        ],
      },
    ]
  }

  return [
    {
      heading: 'Search Intent and Content Goal',
      paragraphs: [
        `This article targets "${primaryKeyword}" with a supporting focus on "${secondaryKeyword}". To rank and convert, the page needs to answer a job-to-be-done, not just describe features. Most visitors are trying to complete a workflow quickly, so the structure should always move from problem to method to outcome.`,
        `The safest way to win this search intent is to give a repeatable process readers can execute immediately. Once users complete one successful output, they naturally become more willing to evaluate tools and advanced options.`,
        `Your current summary already defines the target outcome: ${summary}. Keep every section aligned with that outcome and avoid drifting into product log style writing.`,
      ],
    },
    {
      heading: 'Execution Workflow You Can Follow',
      paragraphs: [
        `Start with one recent trip dataset. A constrained dataset reduces noise and makes route errors easier to debug. Many creators fail early because they combine multiple trips and timezones before validating the core pipeline.`,
        `Then run the core sequence: ${workflow.join(' ')}. The first goal is a usable output, not a perfect one. If you can produce a clear short replay, you already have a strong foundation for iteration.`,
        `After first export, improve pacing and narrative clarity. Open with a route overview, zoom into key stops, and end with a recap frame. This pattern improves retention and makes your map story easier to consume.`,
      ],
    },
    {
      heading: 'Common Mistakes and Fixes',
      paragraphs: [
        `The most common mistake is treating asset volume as quality. Dumping every photo into one replay usually creates weak pacing and low readability. The pain point in this article reflects that directly: ${painPoint}.`,
        `Fixes should be prioritized in order: remove repetitive shots, preserve key transition points, and correct long-distance outliers. These three changes usually deliver the biggest readability gain with minimal effort.`,
        `Another frequent issue is distribution mismatch. Export in your target aspect ratio first instead of cropping later. This avoids losing map context, labels, and caption-safe layout.`,
      ],
    },
    {
      heading: 'Distribution and Conversion Checklist',
      paragraphs: [
        `Do not publish a single version only. Split the same route into three angles: tutorial, comparison, and case study. This gives you broader SEO entry points and better social reuse without redoing the entire production process.`,
        `Every post needs one explicit next action. Tell readers exactly what to do after reading: run the workflow on their latest trip, validate output quality, then optimize style. Concrete CTAs consistently outperform generic prompts.`,
        `When introducing your product, keep it inside the solution narrative. Content-first wording performs better than ad-like wording and is less likely to be filtered as promotion.`,
      ],
    },
    {
      heading: '7-Day Implementation Plan',
      paragraphs: [
        `Day 1-2: build and export the first version. Day 3-4: revise pacing and waypoint clarity based on feedback. Day 5: publish tutorial and comparison derivatives. Day 6-7: update title, intro, and FAQ based on query signals and completion metrics.`,
        `For long-term growth, interlink related articles through topic clusters and related modules. That turns single posts into a compounding SEO network rather than isolated pages.`,
        `Tools like Locusify are most valuable when they compress the path from assets to map replay output, so your time goes to narrative quality and distribution, not repetitive manual processing.`,
      ],
    },
  ]
}

export function getBlogTitleVariants(post: BlogPost, locale: 'zh' | 'en'): BlogVariantSet {
  const primary = locale === 'zh' ? post.title.zh : post.title.en
  const keywords = locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en
  const k1 = keywords[0] ?? (locale === 'zh' ? '旅行地图' : 'travel map')
  const k2 = keywords[1] ?? (locale === 'zh' ? '路线可视化' : 'route visualization')

  if (locale === 'zh') {
    if (post.intent === 'top') {
      return {
        primary,
        alternatives: [
          `如何用 ${k1} 在 10 分钟内做出首个可分享版本`,
          `${k1} 新手指南：从零到可发布的完整流程`,
          `${k2} 实操教程：一步步把旅行素材变成清晰路线`,
        ],
      }
    }
    if (post.intent === 'middle') {
      return {
        primary,
        alternatives: [
          `${k1} 总是做不稳定？这套流程帮你减少返工`,
          `${k2} 进阶实战：提升轨迹准确度与导出质量`,
          `${k1} 工作流优化：从“能用”到“稳定可发布”`,
        ],
      }
    }
    return {
      primary,
      alternatives: [
        `${k1} 对比指南：如何选择最适合你的方案`,
        `${k1} 决策清单：迁移成本、结果质量与上手效率`,
        `${k1} 评测框架：先试跑再决定是否长期使用`,
      ],
    }
  }

  if (post.intent === 'top') {
    return {
      primary,
      alternatives: [
        `How to Build a ${k1} in 10 Minutes`,
        `${k1} for Beginners: From Raw Photos to Shareable Output`,
        `${k2} Step-by-Step: A Practical Starter Workflow`,
      ],
    }
  }
  if (post.intent === 'middle') {
    return {
      primary,
      alternatives: [
        `${k1} Not Stable Yet? Use This Repeatable Workflow`,
        `${k2} Playbook: Improve Accuracy and Export Quality`,
        `${k1} Optimization Guide: From Draft to Publish-Ready`,
      ],
    }
  }
  return {
    primary,
    alternatives: [
      `${k1} Comparison Guide: Which Workflow Fits Best?`,
      `${k1} Decision Checklist: Cost, Speed, and Output Quality`,
      `${k1} Evaluation Framework Before You Switch`,
    ],
  }
}

export function getBlogIntroVariants(post: BlogPost, locale: 'zh' | 'en'): BlogVariantSet {
  const primary = locale === 'zh' ? post.summary.zh : post.summary.en
  const content = locale === 'zh' ? post.content.zh : post.content.en
  const pain = content[0] ?? primary
  const keywords = locale === 'zh' ? post.targetKeywords.zh : post.targetKeywords.en
  const k1 = keywords[0] ?? (locale === 'zh' ? '旅行地图' : 'travel map')

  if (locale === 'zh') {
    if (post.intent === 'top') {
      return {
        primary,
        alternatives: [
          `大多数人第一次做 ${k1} 都卡在“步骤太多”。这篇文章给你一条最短可执行路径，先做出结果，再谈优化。`,
          `如果你只想快速得到一个能分享的版本，不需要复杂配置。按文中的 4 步执行，你今天就能跑通首版。`,
        ],
      }
    }
    if (post.intent === 'middle') {
      return {
        primary,
        alternatives: [
          `你已经知道要做什么，但结果总不稳定。问题通常不在工具，而在流程顺序。本文重点解决这一层。`,
          `常见返工都来自同一个根因：${pain}。下面给出可复用的修正框架。`,
        ],
      }
    }
    return {
      primary,
      alternatives: [
        `如果你正在比较方案，先不要看功能列表。先看三件事：迁移成本、稳定性、最终可发布质量。`,
        `决策阶段最怕“试了很多却看不出差异”。这篇内容给你可量化的比较方法。`,
      ],
    }
  }

  if (post.intent === 'top') {
    return {
      primary,
      alternatives: [
        `Most first-time ${k1} attempts fail because the workflow feels too long. This guide gives you the shortest path to a real output.`,
        `If you only need a shareable first version, start simple. Follow the 4-step flow here and iterate later.`,
      ],
    }
  }
  if (post.intent === 'middle') {
    return {
      primary,
      alternatives: [
        `You already know what you want to produce, but consistency is the problem. This article focuses on process reliability.`,
        `Rework usually comes from one root cause: ${pain}. Below is a repeatable fix framework.`,
      ],
    }
  }
  return {
    primary,
    alternatives: [
      `If you are deciding between options, skip feature lists first. Compare switching cost, output consistency, and publish readiness.`,
      `Decision-stage content should be measurable. This guide gives you a practical evaluation method.`,
    ],
  }
}
