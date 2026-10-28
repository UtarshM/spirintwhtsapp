import { test } from "node:test";
import assert from "node:assert/strict";
import { getAppUrl, getMetadataBaseUrl } from "../src/lib/app-url";

test("getAppUrl handles standard URLs", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    assert.equal(getAppUrl(), "https://example.com");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
  }
});

test("getAppUrl auto-prepends https if scheme is missing", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "my-app.vercel.app";
    assert.equal(getAppUrl(), "https://my-app.vercel.app");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
  }
});

test("getAppUrl strips accidental quotes and markdown formatting", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = '"https://quoted-app.vercel.app"';
    assert.equal(getAppUrl(), "https://quoted-app.vercel.app");

    process.env.NEXT_PUBLIC_APP_URL = "[https://link.com](https://link.com)";
    assert.equal(getAppUrl(), "https://link.com");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
  }
});

test("getAppUrl falls back to localhost when unset", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  const origVercel = process.env.VERCEL_URL;
  try {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(getAppUrl(), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
    process.env.VERCEL_URL = origVercel;
  }
});

test("getAppUrl uses VERCEL_URL if NEXT_PUBLIC_APP_URL is empty", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  const origVercel = process.env.VERCEL_URL;
  try {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_URL = "preview-deployment.vercel.app";
    assert.equal(getAppUrl(), "https://preview-deployment.vercel.app");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
    process.env.VERCEL_URL = origVercel;
  }
});

test("getMetadataBaseUrl never throws and always returns valid URL", () => {
  const orig = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-valid-scheme://??? invalid";
    const u = getMetadataBaseUrl();
    assert.ok(u instanceof URL);
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = orig;
  }
});
