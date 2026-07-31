export interface RichBlogSection {
  heading: string
  paragraphs: string[]
  steps?: string[]
}

export interface RichBlogContent {
  zh: {
    sections: RichBlogSection[]
    faq: Array<{ question: string, answer: string }>
  }
  en: {
    sections: RichBlogSection[]
    faq: Array<{ question: string, answer: string }>
  }
}

export const richBlogContent: Record<string, RichBlogContent> = {
  'how-to-create-an-animated-travel-map': {
    zh: {
      sections: [
        {
          heading: '开始前：先确定地图动画要解决什么问题',
          paragraphs: [
            '旅行路线动画并不是把所有照片依次播放。好的成片需要同时回答三个问题：去了哪里、按什么顺序移动、哪些地点最值得记住。先确定用途，才能选择合适的时长、画幅和照片数量。',
            '如果准备发布到短视频平台，建议先做 30—60 秒竖屏版本；如果用于个人归档，可以保留更多地点和照片。无论哪种用途，都应先做清晰的路线，再增加滤镜、音乐和转场。',
          ],
        },
        {
          heading: '用照片生成旅行路线动画的完整步骤',
          paragraphs: [
            '最稳定的输入是相机原始照片。微信、Instagram 等平台保存下来的图片经常已经删除 EXIF 定位信息，因此应尽量从手机相册、相机存储卡或原始备份中选择文件。',
          ],
          steps: [
            '选择同一次旅行中的原始照片，避免一开始混入多个时区和多段行程。',
            '确认照片包含 GPS 经纬度，并按拍摄时间排序。',
            '把照片放到地图上，检查落在海上、错误城市或跨国跳跃的异常点。',
            '删除同一地点的大量重复连拍，只保留能代表场景变化的照片。',
            '设置路线总览、关键停留点和结束画面，再预览动画节奏。',
            '按目标平台选择横屏或竖屏比例，导出后检查文字和地图标记是否被裁切。',
          ],
        },
        {
          heading: '如何修复最常见的路线错误',
          paragraphs: [
            '异常跳点通常来自三类问题：照片定位精度不足、跨时区后时间顺序错误，或二次编辑后的图片保留了不完整元数据。先看时间，再看坐标，通常比反复调整动画参数更快。',
            '同一景点的几十张连拍也会让动画显得停滞。可以为一个地点保留 1—3 张代表照片，把更多素材放进单独相册，而不是全部参与路线回放。',
          ],
        },
        {
          heading: '不用关键帧完成路线动画',
          paragraphs: [
            '传统视频软件需要手动绘制路线、设置摄像机关键帧并逐张安排照片。照片驱动的工具可以直接读取时间和 GPS 信息，自动完成基础路线，让编辑重点回到选图和叙事。',
            'Locusify 在浏览器本地读取照片信息并生成交互地图和回放，照片无需上传到服务器。你可以先用少量照片免费跑通流程，再决定是否制作完整旅程。',
          ],
        },
      ],
      faq: [
        { question: '制作旅行路线动画必须有 GPX 文件吗？', answer: '不需要。只要照片包含 GPS 经纬度和拍摄时间，就可以按照片顺序重建基础旅行路线。GPX 更适合需要连续、精细轨迹的徒步或骑行记录。' },
        { question: '为什么有些照片无法显示在地图上？', answer: '最常见原因是图片没有 GPS EXIF 信息。社交平台转存、截图和部分编辑软件导出都会删除定位数据，可以改用原始照片或手动放置地点。' },
        { question: '旅行地图动画做多长比较合适？', answer: '社交分享通常以 30—60 秒为宜；个人归档可以更长。先确保路线清楚，再根据关键地点数量增加时长。' },
      ],
    },
    en: {
      sections: [
        {
          heading: 'Decide what the animated map needs to communicate',
          paragraphs: [
            'An effective travel map is not a slideshow of every photo. It should quickly explain where you went, the order of the journey, and which stops mattered most. Define the output before choosing duration, aspect ratio, and photo count.',
            'For short-form platforms, begin with a 30–60 second vertical cut. For a personal archive, keep more stops and context. In both cases, make the route readable before adding music, filters, or elaborate transitions.',
          ],
        },
        {
          heading: 'Step-by-step workflow from photos to route animation',
          paragraphs: [
            'Original camera files are the most reliable source. Images downloaded from messaging or social apps often lose EXIF location metadata, so start with files from your photo library, camera card, or original backup.',
          ],
          steps: [
            'Choose original photos from one trip instead of mixing several journeys and time zones.',
            'Confirm that the files contain GPS coordinates, then sort them by capture time.',
            'Plot the photos and inspect points that land in the ocean, the wrong city, or far from adjacent stops.',
            'Remove dense burst sequences and retain the images that represent a meaningful change of place.',
            'Set an overview, key stops, and a closing frame, then preview the pacing.',
            'Export in the target aspect ratio and verify that labels and map markers remain inside the safe area.',
          ],
        },
        {
          heading: 'Fix common route errors before editing the animation',
          paragraphs: [
            'Large jumps usually come from inaccurate coordinates, time-zone ordering problems, or incomplete metadata in edited copies. Check timestamps first and coordinates second; this is usually faster than repeatedly changing animation settings.',
            'Dozens of photos at one attraction can also make the replay appear frozen. Keep one to three representative photos at each stop and preserve the rest in the original album.',
          ],
        },
        {
          heading: 'Create the route without manual keyframes',
          paragraphs: [
            'Traditional video editors require a manually drawn path, camera keyframes, and individual photo placement. A photo-first workflow uses capture time and GPS metadata to build the base route automatically, leaving you to focus on selection and story.',
            'Locusify reads photo metadata and renders the map locally in your browser, so the photos do not need to be uploaded to a server. Start with a small album to validate the workflow before building the full journey.',
          ],
        },
      ],
      faq: [
        { question: 'Do I need a GPX file to create a travel route animation?', answer: 'No. Photos with GPS coordinates and capture times are enough to reconstruct a basic route. GPX is more useful when you need a continuous, high-detail hiking or cycling track.' },
        { question: 'Why are some photos missing from the map?', answer: 'They probably do not contain GPS EXIF metadata. Screenshots, social downloads, and some edited exports remove location data; use the original file or place the photo manually.' },
        { question: 'How long should a travel map animation be?', answer: 'A 30–60 second cut works well for social sharing. Personal archives can be longer, but route clarity should determine duration rather than the total number of photos.' },
      ],
    },
  },
  'map-your-trip-using-gps-photos': {
    zh: {
      sections: [
        { heading: 'GPS 照片为什么能还原旅行路线', paragraphs: ['手机和部分相机会把经纬度、拍摄时间与设备信息写入照片的 EXIF 元数据。将照片按时间排序并把坐标依次连接，就能得到一条照片驱动的行程路线。', '这种路线不是持续 GPS 记录，因此不会还原每一条街道，但很适合快速整理城市旅行、公路旅行和跨地点相册。'] },
        { heading: '导入前的照片检查清单', paragraphs: ['优先使用原始 HEIC 或 JPEG 文件。先抽查几张照片的定位信息，再处理整个相册，可以避免导入后才发现所有图片都已被平台压缩并删除 GPS。'], steps: ['确认拍照时手机相机拥有定位权限。', '排除截图、海报和与行程无关的图片。', '检查跨时区旅行中的拍摄时间是否正确。', '保留出发、转折、停留和到达地点的代表照片。'] },
        { heading: '地图出现异常点时怎么判断', paragraphs: ['先比较异常照片前后的拍摄时间。如果时间连续但地点相距极远，通常是坐标错误；如果坐标合理但顺序混乱，通常是时区或设备时间问题。', '不要为了路线连续而保留明显错误的数据。删除或手动修正一个异常点，往往比调整整条路线更可靠。'] },
        { heading: '隐私：照片定位信息应该在哪里处理', paragraphs: ['照片位置可能暴露住宅、酒店和个人活动范围。使用任何在线工具前，应确认照片是否上传、保存多久、能否删除，以及是否会用于训练或分析。', 'Locusify 的照片解析和地图渲染在设备本地完成。对于包含敏感地点的相册，仍建议在分享前删除家庭地址等不必要节点。'] },
      ],
      faq: [
        { question: '所有手机照片都有 GPS 吗？', answer: '不一定。只有相机获得定位权限且拍摄时能获取位置的照片通常才包含 GPS；截图、下载图片和隐私设置关闭后的照片通常没有。' },
        { question: 'GPS 照片路线和 GPX 轨迹有什么区别？', answer: 'GPS 照片路线连接的是拍照地点，适合旅行故事；GPX 持续记录移动轨迹，更适合徒步、骑行和精确路径分析。' },
        { question: '分享地图前需要删除哪些地点？', answer: '建议删除或模糊住宅、长期住宿地点、儿童活动地点以及任何不希望公开的精确位置。' },
      ],
    },
    en: {
      sections: [
        { heading: 'How GPS photos reconstruct a trip', paragraphs: ['Phones and some cameras store latitude, longitude, capture time, and device information in EXIF metadata. Sorting those photos by time and connecting their coordinates creates a photo-driven journey route.', 'This is not a continuous GPS trace, so it will not reproduce every street. It is well suited to city trips, road trips, and albums that span several destinations.'] },
        { heading: 'Photo checklist before import', paragraphs: ['Use original HEIC or JPEG files whenever possible. Inspect location data in a few samples before processing the full album so you do not discover too late that a messaging or social app removed every GPS tag.'], steps: ['Confirm that the camera had location permission when the photos were taken.', 'Exclude screenshots, posters, and images unrelated to the route.', 'Check capture times after crossing time zones.', 'Keep representative photos for departures, turns, stops, and arrivals.'] },
        { heading: 'Diagnose incorrect points on the map', paragraphs: ['Compare the timestamps immediately before and after an outlier. Continuous time with an impossible distance usually means bad coordinates; reasonable coordinates in the wrong order usually indicate a time-zone or camera-clock issue.', 'Do not preserve clearly incorrect data just to keep every photo. Removing or manually correcting one outlier is more reliable than distorting the entire route.'] },
        { heading: 'Privacy: where location metadata is processed matters', paragraphs: ['Photo location can reveal homes, hotels, and personal routines. Before using an online tool, check whether files are uploaded, how long they are retained, whether deletion is available, and whether the data is reused.', 'Locusify parses photos and renders the map on the device. Even so, remove home addresses and other sensitive stops before sharing a public route.'] },
      ],
      faq: [
        { question: 'Do all phone photos contain GPS data?', answer: 'No. GPS is normally present only when the camera had location permission and could determine a position. Screenshots, downloaded images, and photos taken with location disabled usually have none.' },
        { question: 'What is the difference between a GPS photo route and a GPX track?', answer: 'A photo route connects the places where photos were taken and is useful for storytelling. GPX records movement continuously and is better for hiking, cycling, and precise path analysis.' },
        { question: 'Which locations should I remove before sharing?', answer: 'Consider removing or reducing the precision of homes, long-term accommodation, children’s locations, and any place you do not want publicly identifiable.' },
      ],
    },
  },
  'visualize-travel-route-from-iphone-photos': {
    zh: {
      sections: [
        { heading: '先确认 iPhone 是否保存了照片位置', paragraphs: ['打开 iPhone“照片”，选择一张原始照片并向上滑动。如果信息面板显示地图和地点，说明照片包含可用定位数据。若没有地图，请检查“设置 → 隐私与安全性 → 定位服务 → 相机”。', '修改定位权限只会影响之后拍摄的照片，不会自动补回旧照片的位置。旧照片可以使用相册中的“调整位置”或在地图工具中手动放置。'] },
        { heading: '为什么 HEIC 原图比转存图片更可靠', paragraphs: ['iPhone 默认使用 HEIC 保存照片，它通常保留完整的拍摄时间和 GPS 信息。发送到社交平台、截图或转换格式后，元数据可能被删除。', '如果浏览器或工具支持 HEIC，直接使用原图最省事；否则转换时要选择保留元数据的方式，并抽查转换后的定位是否仍然存在。'] },
        { heading: '从相册到路线地图的操作流程', paragraphs: ['建议先建立一个仅包含单次旅行的相册，再导出原始文件。这样更容易排除日常照片和错误地点。'], steps: ['在照片 App 中筛选一次旅行的照片。', '保留原始文件并确认几张样本带有地图位置。', '导入后按拍摄时间排列，检查跨时区顺序。', '清理同地点连拍和明显异常点。', '预览路线，再按竖屏或横屏用途导出。'] },
        { heading: '不上传照片也能制作路线', paragraphs: ['定位照片包含敏感信息，因此本地处理尤其适合私人旅行相册。Locusify 在浏览器中读取 HEIC/JPEG 的 EXIF 并渲染地图，照片不需要发送到服务器。', '公开分享前仍应检查起点和终点，避免无意中暴露家庭或住宿地址。'] },
      ],
      faq: [
        { question: 'AirDrop 会删除 iPhone 照片的 GPS 吗？', answer: '通常选择发送原始照片时会保留，但接收端的导出方式仍可能影响元数据。导入前最好抽查一张照片的信息面板。' },
        { question: '微信保存的照片还能生成路线吗？', answer: '很多经过聊天或朋友圈压缩的图片已经没有 GPS。应优先使用 iPhone 相册中的原始文件；没有定位时只能手动放置。' },
        { question: 'HEIC 必须先转成 JPEG 吗？', answer: '不一定。支持 HEIC 的工具可以直接读取原图，这通常更有利于保留定位和时间信息。' },
      ],
    },
    en: {
      sections: [
        { heading: 'Confirm that the iPhone saved photo locations', paragraphs: ['Open Photos, select an original image, and swipe up. A map in the information panel confirms that usable location metadata is present. If no map appears, check Settings → Privacy & Security → Location Services → Camera.', 'Changing the permission only affects future photos. For older images, use Adjust Location in Photos or place them manually in a mapping tool.'] },
        { heading: 'Why original HEIC files are more reliable', paragraphs: ['The iPhone normally stores photos as HEIC with capture time and GPS metadata intact. Social uploads, screenshots, and format conversions can remove that information.', 'If your browser or tool supports HEIC, use the original file. If conversion is necessary, choose a metadata-preserving method and verify location data in a converted sample.'] },
        { heading: 'Workflow from iPhone album to route map', paragraphs: ['Create an album for one trip and export original files. A narrow album makes everyday photos and incorrect locations easier to remove.'], steps: ['Select the trip photos in Apple Photos.', 'Keep originals and verify that several samples show a map location.', 'Import and order by capture time, checking the sequence across time zones.', 'Remove dense bursts and obvious coordinate outliers.', 'Preview the route and export for a vertical or horizontal destination.'] },
        { heading: 'Build the route without uploading private photos', paragraphs: ['Geotagged photos contain sensitive information, which makes local processing valuable for personal albums. Locusify reads HEIC/JPEG EXIF and renders the map in the browser without sending photos to a server.', 'Before publishing, inspect the first and last stops so a home or accommodation address is not exposed accidentally.'] },
      ],
      faq: [
        { question: 'Does AirDrop remove GPS data from iPhone photos?', answer: 'It normally preserves metadata when original files are transferred, but later export steps can still remove it. Check one received photo before importing the full album.' },
        { question: 'Can photos saved from a messaging app create a route?', answer: 'Often they cannot because compressed chat images may have no GPS metadata. Use originals from Apple Photos whenever possible; otherwise place the image manually.' },
        { question: 'Must HEIC be converted to JPEG first?', answer: 'No. Tools with HEIC support can read the original file, which is usually the safest way to preserve capture time and location.' },
      ],
    },
  },
  'travel-map-generator-tools-comparison': {
    zh: {
      sections: [
        { heading: '先按输入来源选择工具', paragraphs: ['旅行地图生成器主要分为照片驱动、GPX 驱动和手动绘制三类。照片驱动适合旅行相册；GPX 适合徒步骑行；手动绘制适合没有定位素材、但需要完全控制路线的演示视频。', '不要只比较模板数量。输入是否匹配，决定了后续需要多少清理和手工修正。'] },
        { heading: '六个真正影响使用体验的比较维度', paragraphs: ['建议用同一组真实旅行素材测试，而不是只看演示视频。'], steps: ['输入格式：是否支持 HEIC、JPEG、GPX 与手动地点。', '路线修正：是否能删除、移动或补充异常节点。', '隐私模式：照片是在本地处理还是上传云端。', '输出形式：交互地图、视频、图片或可分享链接。', '画幅与清晰度：是否适配竖屏、横屏和目标分辨率。', '成本结构：免费功能、水印、导出限制和订阅价格。'] },
        { heading: '什么情况下应该选择照片驱动工具', paragraphs: ['如果旅行已经结束，素材主要保存在手机相册，希望快速还原“去过哪里”，照片驱动方案通常最省时间。它不要求旅途中持续开启定位，也不需要提前记录 GPX。', '缺点是路线精度取决于拍照频率：没有拍照的路段不会产生节点，因此不适合精确运动轨迹分析。'] },
        { heading: 'Locusify 的适用边界', paragraphs: ['Locusify 适合从带 GPS 的旅行照片生成交互路线和动画回放，并强调设备本地处理。它更偏向照片故事和视频输出，而不是持续定位追踪。', '最可靠的选择方式，是拿同一段真实行程分别测试候选工具，记录导入时间、修正次数与最终导出质量。'] },
      ],
      faq: [
        { question: '旅行地图生成器一定需要订阅吗？', answer: '不一定。很多工具提供免费基础能力，但高清视频、去水印、更多模板或云端存储通常可能收费。比较时应以你的最终输出要求为准。' },
        { question: '照片路线和手绘路线哪个更准确？', answer: '照片路线忠于实际拍照地点，但中间路段可能缺失；手绘路线可完全控制，但依赖人工判断。准确性取决于你的数据和用途。' },
        { question: '如何比较两个旅行地图工具？', answer: '使用同一组原始照片，记录导入耗时、异常点数量、修正难度、导出清晰度和隐私处理方式。' },
      ],
    },
    en: {
      sections: [
        { heading: 'Choose by input source first', paragraphs: ['Travel map generators are mainly photo-driven, GPX-driven, or manually drawn. Photo workflows suit travel albums, GPX suits hiking and cycling, and manual routes suit presentations without location data.', 'Do not compare template counts alone. Input fit determines how much cleanup and manual correction the project will require.'] },
        { heading: 'Six comparison criteria that affect real use', paragraphs: ['Test every candidate with the same real trip instead of relying on polished demos.'], steps: ['Inputs: HEIC, JPEG, GPX, and manual locations.', 'Route correction: deleting, moving, and adding stops.', 'Privacy: local processing versus cloud upload.', 'Outputs: interactive maps, videos, images, or share links.', 'Format and quality: vertical, horizontal, and required resolution.', 'Cost: free limits, watermarks, export restrictions, and subscriptions.'] },
        { heading: 'When a photo-driven tool is the right choice', paragraphs: ['If the trip is over, the source material is in a phone album, and the goal is to reconstruct where you went, a photo-driven workflow is usually the fastest. It does not require continuous tracking or a GPX recording made in advance.', 'Its limitation is route precision between photos. Segments without photos have no detailed track, so this approach is not intended for exact sports analysis.'] },
        { heading: 'Where Locusify fits', paragraphs: ['Locusify is designed to create interactive routes and animated replays from geotagged travel photos, with processing kept on the device. It focuses on photo stories and video output rather than continuous location tracking.', 'The most reliable decision is a side-by-side test using the same trip, recording import time, corrections, and final export quality.'] },
      ],
      faq: [
        { question: 'Do travel map generators require a subscription?', answer: 'Not always. Many offer basic free use, while HD export, watermark removal, extra templates, or cloud storage may require payment. Compare against the output you actually need.' },
        { question: 'Is a photo route more accurate than a manually drawn route?', answer: 'A photo route reflects real capture locations but may omit travel between them. A manual route is fully controllable but depends on human judgment. Accuracy depends on the data and purpose.' },
        { question: 'How should I compare two travel map tools?', answer: 'Use the same original photos and record import time, outlier count, correction effort, export quality, and how each service handles private files.' },
      ],
    },
  },
}
