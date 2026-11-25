
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    const respond = (data, status = 200) =>
      Response.json(data, { status, headers });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (url.pathname === "/") {
      return new Response(
        "DERiiLNAY MATH LIVE SERVER AKTIF",
        {
          headers: {
            ...headers,
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    if (url.pathname === "/status") {
      return respond({
        status: "online",
        project: "DERiiLNAY MATH LIVE",
        platform: "Cloudflare Workers",
        database: "D1"
      });
    }

    // TEST KONEKSI WEBSITE
    if (url.pathname === "/api/test" && request.method === "POST") {
      try {
        const data = await request.json();

        return respond({
          success: true,
          message: "Website berhasil terhubung ke server!",
          received: data
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Data tidak valid"
        }, 400);
      }
    }

    // TEST DATABASE KV
    if (url.pathname === "/api/kv-test" && request.method === "GET") {
      try {
        await env.MATH_DATA.put(
          "connection_test",
          "DERIILNAY_KV_BERHASIL"
        );

        const result = await env.MATH_DATA.get(
          "connection_test"
        );

        return respond({
          success: result === "DERIILNAY_KV_BERHASIL",
          message: "Pengujian database KV selesai",
          database: result
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Database KV gagal diakses",
          error: String(error)
        }, 500);
      }
    }

    // MENGAMBIL SOAL AKTIF
    if (url.pathname === "/api/quiz/current" && request.method === "GET") {
      try {
        const quiz = await env.DB.prepare(
          `SELECT question_id, question
           FROM quiz_state
           WHERE id = 1 AND is_active = 1`
        ).first();

        return respond({
          success: true,
          quiz: quiz || null
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Gagal mengambil soal",
          error: String(error)
        }, 500);
      }
    }

    // ADMIN MEMBUAT SOAL
    if (url.pathname === "/api/admin/question" && request.method === "POST") {
      if (!env.ADMIN_TOKEN) {
        return respond({
          success: false,
          message: "ADMIN_TOKEN belum dikonfigurasi"
        }, 503);
      }

      if (
        request.headers.get("Authorization") !==
        `Bearer ${env.ADMIN_TOKEN}`
      ) {
        return respond({
          success: false,
          message: "Akses admin ditolak"
        }, 401);
      }

      try {
        const data = await request.json();

        const question = String(data.question || "").trim();
        const answer = String(data.correct_answer || "").trim();

        if (!question || !answer) {
          return respond({
            success: false,
            message: "Pertanyaan dan jawaban wajib diisi"
          }, 400);
        }

        const questionId = crypto.randomUUID();

        await env.DB.prepare(`
          INSERT INTO quiz_state
            (id, question_id, question, correct_answer, is_active, updated_at)
          VALUES (1, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            question_id = excluded.question_id,
            question = excluded.question,
            correct_answer = excluded.correct_answer,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        `).bind(questionId, question, answer).run();

        return respond({
          success: true,
          message: "Soal berhasil diaktifkan",
          question_id: questionId
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Gagal membuat soal",
          error: String(error)
        }, 500);
      }
    }

    // PESERTA MENGIRIM JAWABAN
    if (url.pathname === "/api/answer" && request.method === "POST") {
      try {
        const data = await request.json();

        const username = String(data.username || "")
          .trim()
          .slice(0, 50);

        const answer = String(data.answer || "")
          .trim()
          .slice(0, 200);

        if (!username || !answer) {
          return respond({
            success: false,
            message: "Username dan jawaban wajib diisi"
          }, 400);
        }

        const quiz = await env.DB.prepare(
          `SELECT question_id, correct_answer
           FROM quiz_state
           WHERE id = 1 AND is_active = 1`
        ).first();

        if (!quiz) {
          return respond({
            success: false,
            message: "Belum ada soal aktif"
          }, 404);
        }

        const isCorrect =
          answer.toLowerCase() ===
          quiz.correct_answer.trim().toLowerCase();

        const existing = await env.DB.prepare(
          `SELECT id
           FROM question_answers
           WHERE question_id = ?
           AND LOWER(username) = LOWER(?)`
        ).bind(quiz.question_id, username).first();

        if (existing) {
          return respond({
            success: false,
            message: "Jawaban akun ini sudah dihitung untuk soal tersebut"
          }, 409);
        }

        const stats = await env.DB.prepare(
          `SELECT total_score, streak
           FROM player_stats
           WHERE LOWER(username) = LOWER(?)`
        ).bind(username).first();

        const oldStreak = stats ? stats.streak : 0;
        const newStreak = isCorrect ? oldStreak + 1 : 0;

        let points = 0;

        if (isCorrect) {
          if (newStreak === 1) points = 10;
          else if (newStreak === 2) points = 15;
          else if (newStreak === 3) points = 20;
          else points = 25;
        }

        const insert = await env.DB.prepare(`
          INSERT OR IGNORE INTO question_answers
            (question_id, username, answer, is_correct, points_awarded)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          quiz.question_id,
          username,
          answer,
          isCorrect ? 1 : 0,
          points
        ).run();

        if (insert.meta.changes === 0) {
          return respond({
            success: false,
            message: "Jawaban sudah pernah dihitung"
          }, 409);
        }

        await env.DB.prepare(`
          INSERT INTO player_stats
            (username, total_score, streak, correct_count, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(username) DO UPDATE SET
            total_score = player_stats.total_score + excluded.total_score,
            streak = excluded.streak,
            correct_count = player_stats.correct_count + excluded.correct_count,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          username,
          points,
          newStreak,
          isCorrect ? 1 : 0
        ).run();

        return respond({
          success: true,
          username,
          correct: isCorrect,
          points,
          streak: newStreak,
          message: isCorrect
            ? "Jawaban benar!"
            : "Jawaban salah, streak direset"
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Gagal memproses jawaban",
          error: String(error)
        }, 500);
      }
    }

    // LEADERBOARD
    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(`
          SELECT username, total_score, streak, correct_count
          FROM player_stats
          ORDER BY total_score DESC, correct_count DESC
          LIMIT 20
        `).all();

        return respond({
          success: true,
          leaderboard: result.results
        });
      } catch (error) {
        return respond({
          success: false,
          message: "Gagal mengambil leaderboard",
          error: String(error)
        }, 500);
      }
    }

    return respond({
      success: false,
      message: "Endpoint tidak ditemukan"
    }, 404);
  }
};
