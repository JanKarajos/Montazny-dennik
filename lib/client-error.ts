export function getUserFacingError(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const message = error.message?.trim();
  if (!message) {
    return fallbackMessage;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "Server je nedostupny. Skontrolujte internet alebo restartujte aplikaciu a skuste znova.";
  }

  if (normalized.includes("aborted") || normalized.includes("timeout")) {
    return "Poziadavka vyprsala. Skuste to znova.";
  }

  return message;
}
