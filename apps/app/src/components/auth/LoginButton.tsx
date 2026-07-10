import type { FC } from 'react'
import { m } from 'motion/react'
import { cn, glassPanel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface LoginButtonProps {
  onClick: () => void
}

export const LoginButton: FC<LoginButtonProps> = ({ onClick }) => {
  const user = useAuthStore(s => s.user)

  return (
    <m.div
      className="absolute top-3 right-2 z-40 sm:top-4 sm:right-4"
      style={{ paddingTop: 'var(--safe-area-top)', paddingRight: 'var(--safe-area-right)' }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className={cn(glassPanel, 'overflow-hidden')}>
        <button
          type="button"
          onClick={onClick}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary relative flex size-10 items-center justify-center transition-colors sm:size-12"
        >
          {user
            ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )
            : (
                <i className="i-mingcute-user-3-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
              )}
        </button>
      </div>
    </m.div>
  )
}
