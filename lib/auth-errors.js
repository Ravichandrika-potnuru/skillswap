export function authSessionErrorStatus(error) {
  const status = Number(error?.status);
  const code = String(error?.code || "");
  if (code.startsWith("NETWORK_") || (status >= 502 && status <= 599)) return 503;
  return 500;
}
