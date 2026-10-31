import type { PhotoManifest } from '../shared/local-gallery'

import type { MasonryRef } from './Masonic'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMobile } from '../shared/local-gallery'
import { Masonry } from './Masonic'
import { MasonryPhotoItem } from './MasonryPhotoItem'

const MasonryItem = memo(MasonryPhotoItem)

const COLUMN_WIDTH_CONFIG = {
  auto: {
    mobile: 150,
    desktop: 250,
    maxColumns: 8,
  },
  min: {
    mobile: 120,
    desktop: 200,
  },
  max: {
    mobile: 250,
    desktop: 500,
  },
}

interface MasonryViewProps {
  photos: PhotoManifest[]
  onRender?: (startIndex: number, stopIndex: number, items: any[]) => void
}

export function MasonryView({ photos, onRender }: MasonryViewProps) {
  const columns: number | 'auto' = 'auto'
  const [containerWidth, setContainerWidth] = useState(0)
  const masonryRef = useRef<MasonryRef>(null)
  const isMobile = useMobile()

  // 监听容器宽度变化
  useEffect(() => {
    const updateContainerWidth = () => {
      setContainerWidth(window.innerWidth)
    }

    updateContainerWidth()
    window.addEventListener('resize', updateContainerWidth)

    return () => {
      window.removeEventListener('resize', updateContainerWidth)
    }
  }, [])

  // 动态计算列宽
  const columnWidth = useMemo(() => {
    const { auto, min, max } = COLUMN_WIDTH_CONFIG
    const gutter = 8 // 列间距
    const availableWidth = containerWidth - (isMobile ? 32 : 48) // 移动端和桌面端的 padding 不同

    if (columns === 'auto') {
      const autoWidth = isMobile ? auto.mobile : auto.desktop
      if (!isMobile) {
        const { maxColumns } = auto
        // 当屏幕宽度超过一定阈值时，通过计算动态列宽来限制最大列数
        const colCount = Math.floor((availableWidth + gutter) / (autoWidth + gutter))

        if (colCount > maxColumns) {
          return (availableWidth - (maxColumns - 1) * gutter) / maxColumns
        }
      }

      return autoWidth
    }

    // 自定义列数模式：根据容器宽度和列数计算列宽
    const calculatedWidth = (availableWidth - (columns - 1) * gutter) / columns

    // 根据设备类型设置最小和最大列宽
    const minWidth = isMobile ? min.mobile : min.desktop
    const maxWidth = isMobile ? max.mobile : max.desktop

    return Math.max(Math.min(calculatedWidth, maxWidth), minWidth)
  }, [isMobile, columns, containerWidth])

  return (
    <Masonry<PhotoManifest>
      ref={masonryRef}
      items={photos}
      render={useCallback(
        props => (
          <MasonryItem {...props} />
        ),
        [],
      )}
      onRender={onRender}
      columnWidth={columnWidth}
      columnGutter={8}
      rowGutter={8}
      itemHeightEstimate={400}
      itemKey={useCallback((data, _index) => {
        return data.id
      }, [])}
    />
  )
}
