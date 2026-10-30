export function resolvePhotoMarkerCardBehavior({ isSelected }: { isSelected: boolean }) {
  return {
    hoverCardCloseDelay: 100,
    hoverCardOpen: undefined,
    hoverCardOpenDelay: 400,
    renderAnchoredCard: isSelected,
  }
}
