# Discovery source survey — LOC-33

Use the current glass panel, theme text/fill tokens, rounded controls and cyan
primary action. Present a Radix modal after authenticated application entry;
never mount on email confirmation or password reset pages. Only the server's
explicit eligibility and pending state may open it. No first-visit heuristic.

Keep the reference's 13 channels and add Bilibili, Douyin and Xiaohongshu.
Native radios form one labelled group (arrow keys / Space); two columns from
640px, one below. A bounded, scrollable body keeps actions visible on small
screens. Radix handles focus trapping, Escape and accessible title/description.
Closing, backdrop dismissal and Skip have the same meaning.

Revision after user review: all 16 sources have local MingCute icons beside their
labels (platform marks where available; a rose book pictogram for Xiaohongshu).
No icon CDN requests. Radios stay visible at the right edge. Below 640px the
modal is capped at `min(68dvh, 560px)`, with a smaller header and independently
scrolling option body. Header and footer do not scroll. Wider layouts retain two
columns and a `min(85dvh, 720px)` cap, including short landscape viewports.

Final backdrop revision (v4): no Dialog.Overlay, fullscreen color or fullscreen
blur. Only the independent glass panel remains over the original application.
Transient, non-persisted visibility defers the existing announcement, help and
feedback surfaces while the survey is open so their own masks cannot appear
underneath it. They resume after dismissal without marking them as seen.

Submit is disabled until a selection exists and while a request is pending.
After an active submission is confirmed as submitted, show a green-check thank-you
toast with a close button, automatically dismissed after six seconds. Failed
requests, skip responses, restored terminal states and late replies after
dismissal/account changes do not show a success message. Use existing Sonner
delivery and glass-panel styles, with Chinese and English copy.
Failures retain the selection and expose retry and Skip. Skip closes immediately,
records an account-scoped local outbox and retries on a timer, online, focus and
next login. A late response cannot reopen the modal or affect another account.
Only a channel enum or skip state enters the API; no free text or analytics.

The API adapter is the only contract boundary. Integrated LOC-34's final
`{eligible,status,source}` response, including `ineligible`, on the same baseline.
PUT sends `{source}` or `{status:'skipped'}`. Terminal replies close the survey
without claiming that the current answer won a concurrent request. The earlier
null/source-only contract is obsolete. Requests capture an account-matched JWT;
they never refresh/replay a mutation under a different account. Skip retry uses
1/2/4/8/16/30-second capped backoff with jitter, pauses 401 until token change,
and stops on 400/403 while preserving local suppression. Storage denial falls
back to memory for this session; clearing browser storage removes local fallback.
