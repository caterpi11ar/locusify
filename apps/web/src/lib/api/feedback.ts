import { apiClient } from './client'

export async function submitFeedback(payload: { rating: number, description?: string }): Promise<void> {
  await apiClient.post('/feedbacks', payload)
}
