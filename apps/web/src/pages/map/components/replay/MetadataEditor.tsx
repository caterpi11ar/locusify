import { Check, PencilLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePhotoStore } from '@/stores/photoStore'
import { useReplayStore } from '@/stores/replayStore'

interface MetadataEditorProps {
  photoId: string
  currentTitle: string
  currentDateTaken: string
}

/** Convert ISO string to datetime-local value (YYYY-MM-DDTHH:mm) */
function isoToDatetimeLocal(iso: string): string {
  if (!iso)
    return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()))
    return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert datetime-local value back to ISO string */
function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString()
}

const inputClass = 'w-full cursor-text border-0 border-b border-dashed border-black/15 bg-transparent px-0 py-1 font-handwriting text-[0.75rem] text-[#444] outline-none transition-[border-color,background-color] placeholder:text-[#aaa] hover:border-black/30 hover:bg-black/[0.03] focus:border-black/40 focus:bg-black/[0.03] dark:border-white/15 dark:text-white/70 dark:placeholder:text-white/30 dark:hover:border-white/30 dark:hover:bg-white/[0.03] dark:focus:border-white/30 dark:focus:bg-white/[0.03]'

export function MetadataEditor({ photoId, currentTitle, currentDateTaken }: MetadataEditorProps) {
  const { t } = useTranslation()
  const updatePhoto = usePhotoStore(s => s.updatePhoto)
  const refreshReplay = useReplayStore(s => s.refreshReplay)

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(currentTitle)
  const [dateValue, setDateValue] = useState(() => isoToDatetimeLocal(currentDateTaken))
  const titleRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    let changed = false
    const updates: { name?: string, dateTaken?: string } = {}
    if (title !== currentTitle) {
      updates.name = title
      changed = true
    }
    if (dateValue) {
      const newIso = datetimeLocalToIso(dateValue)
      if (newIso !== currentDateTaken) {
        updates.dateTaken = newIso
        changed = true
      }
    }
    if (changed) {
      updatePhoto(photoId, updates)
      const markers = usePhotoStore.getState().markers
      refreshReplay(markers)
    }
  }

  const handleOpen = () => {
    setEditing(true)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  const handleDone = () => {
    commit()
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDone()
    }
  }

  if (!editing) {
    return (
      <div className="mt-5 flex justify-center px-2">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-black/20 px-3 py-1 font-handwriting text-[0.7rem] text-[#666] transition-colors hover:border-black/40 hover:text-[#444] active:scale-95 dark:border-white/20 dark:text-white/50 dark:hover:border-white/40 dark:hover:text-white/70"
        >
          <PencilLine className="size-3" />
          {t('metadata.editor.edit')}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-3 px-2">
      <div>
        <span className="font-handwriting text-[0.6rem] tracking-wide text-[#999] dark:text-white/40">
          {t('metadata.editor.title')}
        </span>
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('metadata.editor.titlePlaceholder')}
          className={inputClass}
        />
      </div>
      <div>
        <span className="font-handwriting text-[0.6rem] tracking-wide text-[#999] dark:text-white/40">
          {t('metadata.editor.dateTaken')}
        </span>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={e => setDateValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={inputClass}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleDone}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-black/5 px-3 py-1 font-handwriting text-[0.7rem] text-[#444] transition-colors hover:bg-black/10 active:scale-95 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
        >
          <Check className="size-3" />
          {t('metadata.editor.done')}
        </button>
      </div>
    </div>
  )
}
