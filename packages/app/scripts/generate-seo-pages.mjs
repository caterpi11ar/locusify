import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dist = resolve('dist')
const source = await readFile(resolve(dist, 'index.html'), 'utf8')

const locales = {
  'en': {
    path: 'en',
    lang: 'en',
    locale: 'en_US',
    alternate: 'zh_CN',
    title: 'GPS Photo Map & Travel Route Video Maker | Locusify',
    description: 'Turn GPS-tagged travel photos into an interactive route map, animated journey replay, and MP4 travel video. Private in-browser processing with Locusify.',
    keywords: 'GPS photo map, travel route map, photo map maker, travel video maker, journey replay, EXIF GPS, geotagged photos, travel vlog generator',
    appDescription: 'A browser-based GPS photo map and travel video maker that turns geotagged photos into route maps, animated journey replays, and MP4 videos.',
    features: ['GPS photo route mapping', 'Animated journey replay', 'MP4 travel video export', 'Local in-browser photo processing'],
    heading: 'Turn GPS Travel Photos into Route Maps and Videos',
    intro: 'Locusify reads location data from your travel photos and creates an interactive GPS photo map, chronological journey replay, and downloadable MP4 travel video. Photo processing happens locally in your browser.',
    sections: [
      ['How Locusify works', 'Choose GPS-tagged JPG, PNG, HEIC, WebP, or AVIF photos. Locusify reads their EXIF coordinates locally, plots each stop on an interactive map, connects the route in chronological order, and lets you export the animated journey as an MP4 video.'],
      ['Private, local photo processing', 'Your travel photos and embedded GPS coordinates are processed on your device to create the map and replay. They do not need to be uploaded to a photo-processing server.'],
      ['Who Locusify is for', 'Locusify is designed for travelers, photographers, vloggers, and creators who want a fast way to visualize a trip, map geotagged photos, or make a route animation without traditional video-editing software.'],
    ],
    faqHeading: 'Frequently asked questions',
    faq: [
      ['Does Locusify upload my photos?', 'No. Photo and EXIF processing for maps and replays happens locally in your browser.'],
      ['What photo formats are supported?', 'Locusify supports JPG, PNG, HEIC, WebP, and AVIF. At least two photos with valid GPS data are required for a route replay.'],
      ['Can I export my route as a video?', 'Yes. You can replay the journey chronologically and export the animation as an MP4 travel video.'],
    ],
  },
  'zh-CN': {
    path: 'zh-CN',
    lang: 'zh-CN',
    locale: 'zh_CN',
    alternate: 'en_US',
    title: 'GPS 照片地图与旅行轨迹视频制作工具 | Locusify',
    description: '用 Locusify 将带 GPS 定位的旅行照片自动生成互动路线地图、动态轨迹回放和 MP4 旅行视频。照片与 EXIF 数据均在浏览器本地处理。',
    keywords: 'GPS照片地图, 旅行轨迹地图, 照片地图制作, 旅行视频制作, 足迹地图, EXIF定位, 旅行vlog生成器, 轨迹回放',
    appDescription: '一款基于浏览器的 GPS 照片地图和旅行视频制作工具，可将带定位信息的照片生成路线地图、动态旅程回放和 MP4 视频。',
    features: ['GPS 照片路线地图', '动态旅行轨迹回放', 'MP4 旅行视频导出', '浏览器本地照片处理'],
    heading: '将 GPS 旅行照片制作成路线地图与轨迹视频',
    intro: 'Locusify 可读取旅行照片中的定位信息，自动创建互动 GPS 照片地图、按时间排序的旅程回放和可下载的 MP4 旅行视频。照片处理均在浏览器本地完成。',
    sections: [
      ['Locusify 如何工作', '选择带 GPS 信息的 JPG、PNG、HEIC、WebP 或 AVIF 照片。Locusify 会在本地读取 EXIF 坐标，将每个地点标记在互动地图上，按拍摄时间连接路线，并支持将动态旅程导出为 MP4 视频。'],
      ['保护隐私的本地照片处理', '用于生成地图和轨迹回放的旅行照片及 GPS 坐标均在你的设备上处理，无需上传到照片处理服务器。'],
      ['Locusify 适合谁', 'Locusify 适合旅行者、摄影师、Vlogger 和内容创作者，可快速可视化旅行足迹、绘制照片地点，或无需传统剪辑软件即可制作路线动画。'],
    ],
    faqHeading: '常见问题',
    faq: [
      ['Locusify 会上传我的照片吗？', '不会。用于地图和轨迹回放的照片与 EXIF 信息均在浏览器本地处理。'],
      ['支持哪些照片格式？', 'Locusify 支持 JPG、PNG、HEIC、WebP 和 AVIF。生成路线回放至少需要两张包含有效 GPS 信息的照片。'],
      ['可以将路线导出为视频吗？', '可以。你可以按时间顺序回放旅程，并将动画导出为 MP4 旅行视频。'],
    ],
  },
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

for (const data of Object.values(locales)) {
  const canonical = `https://app.locusify.cn/${data.path}/`
  const content = `<main id="seo-content" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0"><article><h1>${escapeHtml(data.heading)}</h1><p>${escapeHtml(data.intro)}</p>${data.sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('')}<section><h2>${escapeHtml(data.faqHeading)}</h2>${data.faq.map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('')}</section></article></main>`
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://app.locusify.cn/#organization',
        'name': 'Locusify',
        'url': 'https://app.locusify.cn/',
        'logo': { '@type': 'ImageObject', 'url': 'https://app.locusify.cn/logo.png', 'width': 1024, 'height': 1024 },
        'sameAs': ['https://github.com/caterpi11ar/locusify', 'https://www.producthunt.com/products/locusify'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://app.locusify.cn/#website',
        'url': 'https://app.locusify.cn/',
        'name': 'Locusify',
        'inLanguage': ['en', 'zh-CN'],
        'publisher': { '@id': 'https://app.locusify.cn/#organization' },
      },
      {
        '@type': 'WebApplication',
        '@id': `${canonical}#app`,
        'name': 'Locusify',
        'url': canonical,
        'description': data.appDescription,
        'applicationCategory': 'TravelApplication',
        'operatingSystem': 'Any',
        'inLanguage': data.lang,
        'image': 'https://app.locusify.cn/og-image.png',
        'featureList': data.features,
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': data.lang === 'zh-CN' ? 'CNY' : 'USD', 'availability': 'https://schema.org/InStock' },
        'publisher': { '@id': 'https://app.locusify.cn/#organization' },
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        'inLanguage': data.lang,
        'mainEntity': data.faq.map(([name, text]) => ({ '@type': 'Question', name, 'acceptedAnswer': { '@type': 'Answer', text } })),
      },
    ],
  }
  const schemaScript = `<script id="locusify-structured-data" type="application/ld+json">${JSON.stringify(schema)}</script>`

  const html = source
    .replace('<html lang="en"', `<html lang="${data.lang}"`)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(data.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.description)}$2`)
    .replace(/(<meta name="keywords" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.keywords)}$2`)
    .replace(/<script id="locusify-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/, schemaScript)
    .replace(/(<link rel="canonical" href=")[^"]*(" \/>)/, `$1${canonical}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(" \/>)/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.description)}$2`)
    .replace(/(<meta property="og:locale" content=")[^"]*(" \/>)/, `$1${data.locale}$2`)
    .replace(/(<meta property="og:locale:alternate" content=")[^"]*(" \/>)/, `$1${data.alternate}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(" \/>)/, `$1${escapeHtml(data.description)}$2`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`)

  const directory = resolve(dist, data.path)
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'index.html'), html)
}

console.log('Generated localized SEO entry pages: /en/ and /zh-CN/')
