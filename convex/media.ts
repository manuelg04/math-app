import type { QueryCtx } from "./_generated/server";
export async function resolveMedia(ctx: QueryCtx, text: string) {
  const matches = [
    ...new Set([...text.matchAll(/asset:([a-f0-9]{64})/g)].map((m) => m[1])),
  ];
  const urls = await Promise.all(
    matches.map(async (key) => {
      const asset = await ctx.db
        .query("assets")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      return [
        key,
        asset ? await ctx.storage.getUrl(asset.storageId) : null,
      ] as const;
    }),
  );
  for (const [key, url] of urls)
    text = text.replaceAll(`asset:${key}`, url ?? "");
  return text;
}
