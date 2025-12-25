import { Hono } from "hono";
import { cors } from "hono/cors";
import { Rcon } from "rcon-client";

const app = new Hono();
app.use("/*", cors());

// --- CONFIG ---
const RCON_HOST = process.env.MC_HOST || "minecraft";
const RCON_PORT = 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD;
const API_KEY = process.env.API_KEY;

// --- RCON CLIENT ---
let rcon: Rcon | null = null;

async function getRcon() {
  if (rcon && rcon.authenticated) return rcon;

  rcon = new Rcon({
    host: RCON_HOST,
    port: RCON_PORT,
    password: RCON_PASSWORD!,
  });

  await rcon.connect();
  return rcon;
}

// --- ROUTES ---
app.get("/", (c) => c.text("HTTP → RCON bridge alive"));

app.post("/cmd", async (c) => {
  // basic auth so random people don’t nuke your server
  const key = c.req.header("x-api-key");
  if (!API_KEY || key !== API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => null);
  if (!body?.cmd) {
    return c.json({ error: "missing cmd" }, 400);
  }

  try {
    const client = await getRcon();
    const result = await client.send(body.cmd);
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
