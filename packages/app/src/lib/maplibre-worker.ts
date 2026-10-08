import { setWorkerUrl } from 'maplibre-gl'
// maplibre-gl v6 loads its worker from a sibling `maplibre-gl-worker.mjs`
// resolved against `import.meta.url`. Bundlers rewrite that module to a hashed
// chunk, so the sibling file is never emitted and the worker 404s — which
// leaves the map blank/black. Let Vite bundle the worker itself (including its
// `maplibre-gl-shared.mjs` dependency) and point MapLibre at that URL instead.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

export {}
