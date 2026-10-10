export const DIARY_TYPES = ["ASSEMBLY", "SERVICE"] as const;

export type DiaryTypeCode = (typeof DIARY_TYPES)[number];

export type DiaryConfig = {
  type: DiaryTypeCode;
  listPath: string;
  basePath: string;
  diaryName: string;
  listTitle: string;
  listDescription: string;
  itemLabel: string;
  pdfTitle: string;
  fileSlug: string;
  createDescription: string;
  createNumberPlaceholder: string;
  createNamePlaceholder: string;
};

export const DIARY_CONFIG: Record<DiaryTypeCode, DiaryConfig> = {
  ASSEMBLY: {
    type: "ASSEMBLY",
    listPath: "/",
    basePath: "/projekty",
    diaryName: "Montážny denník",
    listTitle: "Zákazky",
    listDescription: "Prehľad montážnych zákaziek s filtrovaním na aktívne a ukončené.",
    itemLabel: "Zákazka",
    pdfTitle: "MONTÁŽNY PROTOKOL",
    fileSlug: "montazny-dennik",
    createDescription: "Vytvorte novú zákazku pre montážny tím.",
    createNumberPlaceholder: "Napr. ZA-2026-014",
    createNamePlaceholder: "Napr. Volkswagen - montáž linky",
  },
  SERVICE: {
    type: "SERVICE",
    listPath: "/servis",
    basePath: "/servis",
    diaryName: "Servisný denník",
    listTitle: "Servisné zákazky",
    listDescription: "Prehľad servisných zákaziek s filtrovaním na aktívne a ukončené.",
    itemLabel: "Servisná zákazka",
    pdfTitle: "SERVISNÝ PROTOKOL",
    fileSlug: "servisny-dennik",
    createDescription: "Vytvorte novú servisnú zákazku pre servisný tím.",
    createNumberPlaceholder: "Napr. SE-2026-007",
    createNamePlaceholder: "Napr. Volkswagen - servis robotickej bunky",
  },
};

export function isDiaryType(value: unknown): value is DiaryTypeCode {
  return typeof value === "string" && DIARY_TYPES.includes(value as DiaryTypeCode);
}
