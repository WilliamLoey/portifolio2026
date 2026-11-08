export default async function globalTeardown() {
  const pglite = (globalThis as Record<string, unknown>).__PGLITE__ as
    | { db: { close(): Promise<void> }; server: { stop(): Promise<void> } }
    | undefined;
  if (pglite) {
    await pglite.server.stop();
    await pglite.db.close();
  }
}
