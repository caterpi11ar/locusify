import type { FC } from 'react'
import type { Photo } from '@/types/photo'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { usePhotos } from '@/contexts'
import { cn, glassPanel } from '@/lib/utils'
import { GPSInfoPanel } from './GPSInfoPanel'
import { PhotoSelector } from './PhotoSelector'

enum DrawerStep {
  SELECT = 'select',
  PREVIEW = 'preview',
}

interface SelectPhotosDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SelectPhotosDrawer: FC<SelectPhotosDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation()
  const { addPhotos } = usePhotos()
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
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh] border-none bg-transparent backdrop-blur-none">
        {/* Header - only show on select step */}
        {currentStep === DrawerStep.SELECT && (
          <DrawerHeader className="hidden">
            <DrawerTitle>{t('photos.select.title')}</DrawerTitle>
            <DrawerDescription>
              {t('photos.select.description')}
            </DrawerDescription>
          </DrawerHeader>
        )}

        {/* Content with glass background */}
        <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
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
      </DrawerContent>
    </Drawer>
  )
}
