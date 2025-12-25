import { Hono } from "hono";
import { cors } from "hono/cors";
import { Rcon } from "rcon-client";

const app = new Hono();
app.use("/*", cors());

// ENV
const RCON_HOST = process.env.MC_HOST || "minecraft";
const RCON_PORT = 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD;
const API_KEY = process.env.API_KEY;

// RCON connection (lazy + reusable)
let rcon = null;

async function getRcon() {
  if (rcon && rcon.authenticated) return rcon;

  rcon = new Rcon({
    host: RCON_HOST,
    port: RCON_PORT,
    password: RCON_PASSWORD
  });

  await rcon.connect();
  return rcon;
}

// Routes
app.get("/", (c) => c.text("HTTP → RCON bridge (Node) alive"));

app.get("/health", (c) => c.json({ ok: true }));

app.post("/cmd", async (c) => {
  const key = c.req.header("x-api-key");
  if (!API_KEY || key !== API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  if (!body.cmd) {
    return c.json({ error: "missing cmd" }, 400);
  }

  try {
    const client = await getRcon();
    const result = await client.send(body.cmd);
    return c.json({ ok: true, result });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// Railway provides PORT automatically
const port = process.env.PORT || 3000;

export default {
  port,
  fetch: app.fetch
};
