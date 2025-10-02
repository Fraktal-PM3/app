import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // allow requests from frontend
app.use(express.json());

// Example route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Example route: return dummy posts
app.get("/api/posts", (req, res) => {
  res.json([
    { id: 1, title: "First package post" },
    { id: 2, title: "Second package post" },
  ]);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
