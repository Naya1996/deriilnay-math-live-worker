
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/") {
      return new Response(
        "DERiiLNAY MATH LIVE SERVER AKTIF",
        { headers }
      );
    }

    if (url.pathname === "/status") {
      return Response.json({
        status: "online",
        project: "DERiiLNAY MATH LIVE",
        platform: "Cloudflare Workers"
      }, { headers });
    }

    if (url.pathname === "/api/test" && request.method === "POST") {
      try {
        const data = await request.json();

        return Response.json({
          success: true,
          message: "Website berhasil terhubung ke server!",
          received: data
        }, { headers });

      } catch (error) {
        return Response.json({
          success: false,
          message: "Data tidak valid"
        }, { status: 400, headers });
      }
    }

    return Response.json({
      status: "error",
      message: "Endpoint tidak ditemukan"
    }, { status: 404, headers });
  }
};
