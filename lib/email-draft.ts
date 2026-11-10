// Koncept e-mailu (.eml) s prílohou. Hlavička `X-Unsent: 1` spôsobí, že ho Outlook
// otvorí ako novú, ešte neodoslanú správu, ktorú stačí odoslať.

type EmailDraftInput = {
  to: string;
  subject: string;
  body: string;
  attachment: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  };
};

const CRLF = "\r\n";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function utf8ToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join(CRLF) ?? "";
}

// RFC 2047 – hlavičky s diakritikou.
function encodeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8ToBase64(value)}?=`;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildEmailDraft({ to, subject, body, attachment }: EmailDraftInput): string {
  const boundary = `----=_Part_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const fileName = sanitizeHeaderValue(attachment.fileName);
  const encodedFileName = encodeHeader(fileName);
  const recipient = sanitizeHeaderValue(to);

  const headers = [
    ...(recipient ? [`To: ${recipient}`] : []),
    `Subject: ${encodeHeader(sanitizeHeaderValue(subject))}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  return [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8ToBase64(body)),
    "",
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${encodedFileName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${encodedFileName}"`,
    "",
    wrapBase64(bytesToBase64(attachment.bytes)),
    "",
    `--${boundary}--`,
    "",
  ].join(CRLF);
}
