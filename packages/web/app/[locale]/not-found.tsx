import { getLocale } from 'next-intl/server'
import { NotFoundContent } from '@/components/not-found-content'

export default async function NotFound() {
  return <NotFoundContent locale={await getLocale()} />
}
