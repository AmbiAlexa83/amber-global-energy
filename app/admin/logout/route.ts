// HTTP Basic Auth logout: returning 401 with a different realm causes most browsers
// to discard the cached credentials for the previous realm and re-challenge on the
// next visit to /admin. However, some browsers require a full session close or a
// private/incognito window to completely clear cached credentials.
export async function GET() {
  return new Response("Logged out. Close this tab or return to sign in again.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Amber Global Energy Admin - Signed Out"',
      "Cache-Control": "no-store",
      "Clear-Site-Data": '"cache", "cookies"',
    },
  });
}
