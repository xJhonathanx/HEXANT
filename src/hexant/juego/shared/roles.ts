export type RolCanonico = "obrera" | "nurse" | "constructora" | "soldado" | "reina";

/** Devuelve un rol canónico sin importar cómo llegue escrito. */
export function normalizeRole(r: unknown): RolCanonico {
  const s = String(r ?? "").trim().toLowerCase();

  if (["constructora","constructor","builder","build","constructoras"].includes(s)) return "constructora";
  if (["obrera","worker","workers"].includes(s)) return "obrera";
  if (["nurse","nurses","nodriza","nodrizas"].includes(s)) return "nurse";
  if (["soldado","soldier","soldiers"].includes(s)) return "soldado";
  if (["reina","queen"].includes(s)) return "reina";

  return "obrera";
}

/** Glyph por rol (ajústalo a tu estilo de UI) */
export function glyphByRole(r: unknown): string {
  switch (normalizeRole(r)) {
    case "constructora": return "B"; // Builder
    case "obrera":       return "W";
    case "nurse":        return "N";
    case "soldado":      return "S";
    case "reina":        return "Q";
  }
}