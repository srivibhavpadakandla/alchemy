export function authNext(value: string | null) {
  return value &&
    /^\/(?:customer|invite|app)(?:\/|$)/.test(value) &&
    !value.includes("\\") &&
    !/[\x00-\x1f]/.test(value)
    ? value
    : "/app";
}
