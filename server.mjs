import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDecartClient } from "@decartai/sdk";

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const production = process.argv.includes("--production");

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.post("/api/realtime-token", async (_request, response) => {
  const apiKey = process.env.DECART_API_KEY;

  if (!apiKey) {
    return response.status(503).json({
      error: "missing_api_key",
      message: "服务端尚未配置 DECART_API_KEY。",
    });
  }

  try {
    const client = createDecartClient({ apiKey });
    const token = await client.tokens.create({
      expiresIn: 120,
      constraints: { realtime: { maxSessionDuration: 90 } },
    });
    return response.json(token);
  } catch (error) {
    console.error("Failed to mint Decart client token", error);
    return response.status(502).json({
      error: "token_error",
      message: "无法创建 Decart 临时令牌，请检查 API Key 和账户余额。",
    });
  }
});

if (production) {
  app.use(express.static(path.join(root, "dist")));
  app.use((_request, response) => {
    response.sendFile(path.join(root, "dist", "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(port, "127.0.0.1", () => {
  console.log(`试衣镜运行于 http://127.0.0.1:${port}`);
});
