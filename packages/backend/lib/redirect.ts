export function isAllowedRedirectUri(uri: string): boolean {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const defaultUri = `${frontendUrl}/auth/callback`;

  const extra = (process.env.ALLOWED_REDIRECT_URIS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return [defaultUri, ...extra].some((pattern) => {
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) return uri.startsWith(pattern.slice(0, -1));
    return uri === pattern;
  });
}
