import { z } from "zod";

export const personNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(2, "Meno musí mať aspoň 2 znaky.").max(100, "Meno je príliš dlhé."));
