
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
        "DERiiLNAY MATH LIVE SERVER AKTIF"
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

    if (url.pathname === "/api/kv-test" && request.method === "GET") {
      try {
        await env.MATH_DATA.put(
          "connection_test",
          "DERIILNAY_KV_BERHASIL"
        );

        const result = await env.MATH_DATA.get(
          "connection_test"
        );

        return Response.json({
          success: result === "DERIILNAY_KV_BERHASIL",
          message: "Pengujian database KV selesai",
          database: result
        }, { headers });

      } catch (error) {
        return Response.json({
          success: false,
          message: "Database KV gagal diakses",
          error: String(error)
        }, { status: 500, headers });
      }
    }

    return Response.json({
      status: "error",
      message: "Endpoint tidak ditemukan"
    }, { status: 404, headers });
  }
};
