import type { FC } from 'react'
import type { AvatarSource } from '@/types/replay'
import { useTranslation } from 'react-i18next'
import { presetAvatars } from '@/data/presetAvatars'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

export const AvatarSetting: FC = () => {
  const { t } = useTranslation()
  const { avatarSource, setAvatarSource } = useSettingsStore()
  const user = useAuthStore(s => s.user)

  const isSelected = (source: AvatarSource) => {
    if (source.type !== avatarSource.type)
      return false
    if (source.type === 'preset' && avatarSource.type === 'preset')
      return source.presetId === avatarSource.presetId
    return true
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="i-mingcute-user-3-line size-4 text-text/50" />
        <span className="text-sm font-medium text-text">{t('settings.avatar')}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto py-1">
        {/* Profile avatar option (if logged in) */}
        {user && (
          <button
            type="button"
            onClick={() => setAvatarSource({ type: 'profile' })}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div
              className={cn(
                'size-12 rounded-full overflow-hidden border-2 transition-all',
                isSelected({ type: 'profile' })
                  ? 'border-sky-400 ring-2 ring-sky-400/40'
                  : 'border-fill-tertiary',
              )}
            >
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                : <div className="flex size-full items-center justify-center bg-sky-400 text-lg font-bold text-white">{user.name?.[0] ?? '?'}</div>}
            </div>
            <span className="text-[10px] text-text/60">{t('settings.avatarProfile')}</span>
          </button>
        )}

        {/* Preset avatars */}
        {presetAvatars.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setAvatarSource({ type: 'preset', presetId: preset.id })}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-full border-2 transition-all',
                isSelected({ type: 'preset', presetId: preset.id })
                  ? 'ring-2 ring-sky-400/40'
                  : '',
              )}
              style={{
                backgroundColor: preset.color,
                borderColor: isSelected({ type: 'preset', presetId: preset.id }) ? '#38bdf8' : preset.color,
              }}
            >
              <span className={cn(preset.icon, 'size-6 text-white')} />
            </div>
            <span className="text-[10px] text-text/60">{t(preset.nameKey)}</span>
          </button>
        ))}

        {/* None / Default option */}
        <button
          type="button"
          onClick={() => setAvatarSource({ type: 'none' })}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-full border-2 transition-all bg-fill-secondary',
              isSelected({ type: 'none' })
                ? 'border-sky-400 ring-2 ring-sky-400/40'
                : 'border-fill-tertiary',
            )}
          >
            <div className="size-3 rounded-full bg-sky-400" />
          </div>
          <span className="text-[10px] text-text/60">{t('settings.avatarNone')}</span>
        </button>
      </div>
    </div>
  )
}
