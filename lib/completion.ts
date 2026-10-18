export type CompletionMethodCode = "DIGITAL_SIGNATURE" | "PAPER_PROTOCOL" | "WITHOUT_SIGNATURE";

export const COMPLETION_METHOD_LABELS: Record<CompletionMethodCode, string> = {
  DIGITAL_SIGNATURE: "digitálny podpis oboch strán",
  PAPER_PROTOCOL: "podpísaný papierový protokol",
  WITHOUT_SIGNATURE: "bez podpisu",
};
