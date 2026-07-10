import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      toastOptions={{
        className:
          'bg-material-thick backdrop-blur-[120px] border-fill-tertiary text-text shadow-2xl',
      }}
      {...props}
    />
  )
}

export { Toaster }
