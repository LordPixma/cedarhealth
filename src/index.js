// Cedar Health — Worker entry point.
// The Worker is the front door (assets.run_worker_first = true):
//   /api/*    -> JSON API
//   /media/*  -> images from R2
//   /         -> server-rendered home (from D1 content)
//   /intake   -> server-rendered patient intake form
//   else      -> static assets (styles.css, script.js, /images, /admin, favicon)

import { handleApi } from "./api.js";
import { renderHome, renderIntake } from "./site.js";
import { getAllContent } from "./lib/db.js";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN"
};

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS }
  });
}

async function serveMedia(env, key) {
  if (!key) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API
    if (path === "/api" || path.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // R2-backed uploaded media
    if (path.startsWith("/media/")) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", { status: 405 });
      }
      return serveMedia(env, decodeURIComponent(path.slice("/media/".length)));
    }

    // Server-rendered pages (GET/HEAD)
    if (request.method === "GET" || request.method === "HEAD") {
      const clean = path.replace(/\/+$/, "") || "/";
      if (clean === "/") {
        return htmlResponse(renderHome(await getAllContent(env)));
      }
      if (clean === "/intake") {
        return htmlResponse(renderIntake(await getAllContent(env)));
      }
      // Pretty URL for the editor: /admin -> /admin/index.html (no redirect).
      if (clean === "/admin") {
        return env.ASSETS.fetch(new Request(new URL("/admin/index.html", url), request));
      }
    }

    // Static assets (admin app, styles, scripts, seed images, favicon, …)
    return env.ASSETS.fetch(request);
  }
};
