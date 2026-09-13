import { createApp } from "../server/app";

const app = createApp();

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (error) {
    console.error("[Vercel API] handler failed", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "API handler failed" });
    }
  }
}
