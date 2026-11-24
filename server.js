const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("DERiiLNAY MATH LIVE SERVER AKTIF");
});

app.get("/status", (req, res) => {
  res.json({
    status: "online",
    project: "DERiiLNAY MATH LIVE"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server berjalan di port " + PORT);
});
