export const VIEWER_TRANSITION_TRIGGER_ATTRIBUTE = 'data-viewer-transition-id'

export function getViewerTransitionTriggerProps(itemId: string) {
  return {
    [VIEWER_TRANSITION_TRIGGER_ATTRIBUTE]: itemId,
  }
}
