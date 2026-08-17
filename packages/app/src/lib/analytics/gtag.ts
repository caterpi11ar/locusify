export function trackSignUp(method: 'password' | 'oauth') {
  window.gtag?.('event', 'sign_up', {
    method,
    page_referrer: document.referrer || undefined,
  })
}
