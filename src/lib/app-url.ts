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

export type SubdomainTarget = "marketing" | "app" | "admin";

/**
 * Returns the fully qualified URL for a given subdomain and path.
 * Supports production domains (scalezix.ai, app.scalezix.ai, admin.scalezix.ai)
 * and local development (localhost:3000, app.localhost:3000, admin.localhost:3000).
 */
export function getSubdomainUrl(target: SubdomainTarget, path = ""): string {
  const base = getAppUrl();
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  try {
    const url = new URL(base);
    const host = url.hostname;
    const port = url.port ? `:${url.port}` : "";

    // Localhost development
    if (host === "localhost" || host === "127.0.0.1") {
      if (target === "marketing") return `${url.protocol}//localhost${port}${normalizedPath}`;
      return `${url.protocol}//${target}.localhost${port}${normalizedPath}`;
    }

    // Production domain handling
    const parts = host.split(".");
    if (parts.length > 2) {
      // Already has a subdomain (e.g. app.scalezix.ai or preview.scalezix.ai)
      const apex = parts.slice(-2).join(".");
      if (target === "marketing") return `${url.protocol}//${apex}${port}${normalizedPath}`;
      return `${url.protocol}//${target}.${apex}${port}${normalizedPath}`;
    }

    // Apex domain (e.g. scalezix.ai)
    if (target === "marketing") return `${url.protocol}//${host}${port}${normalizedPath}`;
    return `${url.protocol}//${target}.${host}${port}${normalizedPath}`;
  } catch {
    return `${base}${normalizedPath}`;
  }
}

