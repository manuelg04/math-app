import { ConvexError } from "convex/values";
export function message(error: unknown) {
  return error instanceof ConvexError
    ? String(error.data)
    : "No pudimos completar la acción. Revisa tu conexión e intenta nuevamente.";
}
