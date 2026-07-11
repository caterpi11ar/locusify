import { Marker } from 'react-map-gl/maplibre'

interface CurrentLocationMarkerProps {
  longitude: number
  latitude: number
}

export function CurrentLocationMarker({ longitude, latitude }: CurrentLocationMarkerProps) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center" style={{ zIndex: 30 }}>
      <div className="pointer-events-none relative flex size-12 items-center justify-center">
        <div className="absolute size-12 animate-ping rounded-full bg-[#0A84FF]/20" />
        <div className="absolute size-8 rounded-full bg-[#0A84FF]/10" />
        <div className="relative flex size-5 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.28)]">
          <div className="size-3.5 rounded-full bg-[#0A84FF] shadow-[0_0_8px_rgba(10,132,255,0.55)]" />
        </div>
      </div>
    </Marker>
  )
}
