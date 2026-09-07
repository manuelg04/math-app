import { v, ConvexError } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { profile } from "./access";
import { profileView } from "./validators";
import { internal } from "./_generated/api";

export const me = query({
  args: {},
  returns: v.union(profileView, v.null()),
  handler: async (ctx) => {
    const auth = await authComponent.safeGetAuthUser(ctx);
    if (!auth) return null;
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_authId", (q) => q.eq("authId", auth._id))
      .unique();
    return {
      name: p?.name ?? auth.name,
      email: auth.email,
      program: p?.program ?? "",
      onboarded: p?.onboarded ?? false,
      photo: p?.photoId ? await ctx.storage.getUrl(p.photoId) : null,
    };
  },
});
export const complete = mutation({
  args: { name: v.string(), program: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await authComponent.getAuthUser(ctx);
    const name = args.name.trim();
    const program = args.program.trim();
    if (
      name.length < 2 ||
      name.length > 100 ||
      program.length < 2 ||
      program.length > 150
    )
      throw new ConvexError("Revisa tu nombre y programa académico.");
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_authId", (q) => q.eq("authId", auth._id))
      .unique();
    if (p) await ctx.db.patch(p._id, { name, program, onboarded: true });
    else
      await ctx.db.insert("profiles", {
        authId: auth._id,
        email: auth.email,
        name,
        program,
        onboarded: true,
      });
    return null;
  },
});
export const uploadPhoto = action({
  args: { bytes: v.bytes(), contentType: v.string() },
  returns: v.null(),
  handler: async (ctx, { bytes, contentType }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (
      bytes.byteLength > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(contentType)
    )
      throw new ConvexError("Usa una imagen JPG, PNG o WebP de máximo 5 MB.");
    const data = new Uint8Array(bytes);
    const valid =
      contentType === "image/png"
        ? data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71
        : contentType === "image/jpeg"
          ? data[0] === 255 && data[1] === 216 && data[2] === 255
          : String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...data.slice(8, 12)) === "WEBP";
    if (!valid) throw new ConvexError("El archivo no es una imagen válida.");
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: contentType }),
    );
    try {
      await ctx.runMutation(internal.profiles.attachPhoto, {
        authId: user._id,
        storageId,
      });
    } catch (e) {
      await ctx.storage.delete(storageId);
      throw e;
    }
    return null;
  },
});
export const attachPhoto = internalMutation({
  args: { authId: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { authId, storageId }) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
    if (!p) throw new ConvexError("Completa tu perfil.");
    await ctx.db.insert("uploads", { owner: p._id, storageId });
    await ctx.db.patch(p._id, { photoId: storageId });
    if (p.photoId) await ctx.storage.delete(p.photoId);
    return null;
  },
});
export const changePassword = mutation({
  args: { currentPassword: v.string(), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await profile(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: { ...args, revokeOtherSessions: true },
      headers,
    });
    return null;
  },
});
