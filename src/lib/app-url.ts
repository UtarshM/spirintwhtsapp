export function getAppUrl(): string {
  let raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    raw = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }
  if (!raw && process.env.VERCEL_URL) {
    raw = `https://${process.env.VERCEL_URL.trim()}`;
  }
  if (!raw) {
    return "http://localhost:3000";
  }

  // Handle accidental markdown links like [http://localhost:3000](http://localhost:3000)
  const mdMatch = raw.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch?.[1]) {
    raw = mdMatch[1];
  }

  // Strip leading/trailing quotes, apostrophes, brackets
  raw = raw.replace(/^["'\[]+|["'\]]+$/g, "").trim();

  // If missing scheme, prepend https://
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function getMetadataBaseUrl(): URL {
  try {
    return new URL(getAppUrl());
  } catch {
    return new URL("http://localhost:3000");
  }
}
