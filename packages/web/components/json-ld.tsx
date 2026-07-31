type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>

export function JsonLd({ data }: { data: JsonLdValue }) {
  const json = JSON.stringify(data).replaceAll('<', '\\u003c')

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
