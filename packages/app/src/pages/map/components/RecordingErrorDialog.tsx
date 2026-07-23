import type { RecordingFailureReason } from '@/hooks/useVideoRecorder'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'

interface RecordingErrorDialogProps {
  reason: RecordingFailureReason | null
  onClose: () => void
}

export function RecordingErrorDialog({ reason, onClose }: RecordingErrorDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={reason !== null}
      onCancel={onClose}
      footer={null}
      centered
      width={420}
      maskClosable={false}
      title={t('recording.error.title')}
      styles={{
        container: {
          background: 'var(--color-material-opaque)',
          border: '1px solid var(--color-fill-tertiary)',
          borderRadius: 16,
        },
        header: { background: 'transparent' },
      }}
    >
      <div className="pt-2">
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
          <i className="i-mingcute-alert-line text-xl" />
        </div>
        <p className="text-text-secondary text-sm leading-relaxed">
          {t(`recording.error.${reason ?? 'permission-denied'}`)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-10 w-full rounded-xl bg-sky-400 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-500"
        >
          {t('recording.error.gotIt')}
        </button>
      </div>
    </Modal>
  )
}
