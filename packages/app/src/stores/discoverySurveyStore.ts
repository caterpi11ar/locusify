import { create } from 'zustand'

// Transient presentation state only; never persist survey visibility.
export const useDiscoverySurveyStore = create(() => ({ open: false }))
