import { BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_VERY_HIGH, WEBM } from 'mediabunny'

export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const input = new Input({ source: new BlobSource(webmBlob), formats: [WEBM] })
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })

  const conversion = await Conversion.init({
    input,
    output,
    video: { codec: 'avc', bitrate: QUALITY_VERY_HIGH },
    audio: { codec: 'aac', bitrate: 128_000 },
  })

  if (onProgress)
    conversion.onProgress = onProgress
  await conversion.execute()

  const buffer = (output.target as BufferTarget).buffer
  if (!buffer)
    throw new Error('MP4 conversion produced no output')
  return new Blob([buffer], { type: 'video/mp4' })
}
