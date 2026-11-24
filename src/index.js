
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("DERiiLNAY MATH LIVE SERVER AKTIF", {
        headers: { "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    if (url.pathname === "/status") {
      return Response.json({
        status: "online",
        project: "DERiiLNAY MATH LIVE",
        platform: "Cloudflare Workers"
      });
    }

    return Response.json({
      status: "error",
      message: "Endpoint tidak ditemukan"
    }, { status: 404 });
  }
};
