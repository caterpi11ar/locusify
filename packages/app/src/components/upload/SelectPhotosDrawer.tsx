import type { FC } from 'react'
import type { Photo } from '@/types/photo'
import { Drawer as AntDrawer } from 'antd'
import { X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, glassPanel } from '@/lib/utils'
import { usePhotoStore } from '@/stores/photoStore'
import { GPSInfoPanel } from './GPSInfoPanel'
import { PhotoSelector } from './PhotoSelector'

enum DrawerStep {
  SELECT = 'select',
  PREVIEW = 'preview',
}

interface SelectPhotosDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentClassName?: string
  modal?: boolean
  desktopOffset?: number
}

export const SelectPhotosDrawer: FC<SelectPhotosDrawerProps> = ({
  open,
  onOpenChange,
  contentClassName,
  modal,
  desktopOffset = 0,
}) => {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const addPhotos = usePhotoStore(s => s.addPhotos)
  const [currentStep, setCurrentStep] = useState<DrawerStep>(DrawerStep.SELECT)
  const [selectedFiles, setSelectedFiles] = useState<Photo[]>([])

  // Handle file selection
  const handleFilesSelected = useCallback((files: Photo[]) => {
    setSelectedFiles(files)
    if (files.length > 0) {
      setCurrentStep(DrawerStep.PREVIEW)
    }
  }, [])

  // Handle confirm - add photos to context and close
  const handleConfirm = useCallback(() => {
    // Filter only files with GPS data
    const filesWithGPS = selectedFiles.filter(file => file.gpsInfo)

    // Add to context
    addPhotos(filesWithGPS)

    // Close drawer and reset
    onOpenChange(false)
    setCurrentStep(DrawerStep.SELECT)
    setSelectedFiles([])
  }, [selectedFiles, addPhotos, onOpenChange])

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSelectedFiles([])
    setCurrentStep(DrawerStep.SELECT)
  }, [])

  // Handle remove file
  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter(f => f.id !== fileId)
      if (updated.length === 0) {
        setCurrentStep(DrawerStep.SELECT)
      }
      return updated
    })
  }, [])

  // Handle drawer close
  const handleClose = useCallback(() => {
    setCurrentStep(DrawerStep.SELECT)
    setSelectedFiles([])
    onOpenChange(false)
  }, [onOpenChange])

  // Handle open change
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        handleClose()
      }
      else {
        onOpenChange(isOpen)
      }
    },
    [handleClose, onOpenChange],
  )

  return (
    <AntDrawer
      open={open}
      onClose={() => handleOpenChange(false)}
      placement={isMobile ? 'bottom' : 'left'}
      size={isMobile ? 'auto' : 480}
      mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
      zIndex={!isMobile && modal === false ? 900 : undefined}
      closable={false}
      destroyOnHidden
      rootClassName={cn('locusify-drawer', contentClassName)}
      rootStyle={!isMobile ? { left: desktopOffset } : undefined}
      styles={{
        wrapper: isMobile
          ? { maxHeight: '90dvh' }
          : { height: '100dvh', width: 480 },
        section: { background: 'transparent', boxShadow: 'none' },
        body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
      }}
    >
      <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-0">
          <h2 className="text-text text-lg font-semibold">
            {currentStep === DrawerStep.SELECT ? t('photos.select.title') : t('photos.preview.title')}
          </h2>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => handleOpenChange(false)}
            className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: File Selection */}
          {currentStep === DrawerStep.SELECT && (
            <PhotoSelector onFilesSelected={handleFilesSelected} />
          )}

          {/* Step 2: GPS Info Preview */}
          {currentStep === DrawerStep.PREVIEW && (
            <GPSInfoPanel
              files={selectedFiles}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onRemoveFile={handleRemoveFile}
            />
          )}
        </div>
      </div>
    </AntDrawer>
  )
}
