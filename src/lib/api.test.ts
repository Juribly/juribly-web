import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";

async function setup(handler: any) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  process.env.VITE_API_URL = `http://127.0.0.1:${port}`;
  vi.resetModules();
  const api = (await import("./api.ts")).default;
  return { api, server };
}

afterEach(() => {
  delete process.env.VITE_API_URL;
});

describe("api client", () => {
  it("handles happy path", async () => {
    const { api, server } = await setup((req: any, res: any) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
    const data = await api.get("/");
    expect(data.ok).toBe(true);
    server.close();
  });

  it("times out", async () => {
    const { api, server } = await setup((req: any, res: any) => {
      setTimeout(() => {
        res.setHeader("Content-Type", "application/json");
        res.end("{}");
      }, 100);
    });
    await expect(api.get("/", { timeout: 50 })).rejects.toMatchObject({ code: "timeout" });
    server.close();
  });

  it("fails on non-JSON", async () => {
    const { api, server } = await setup((req: any, res: any) => {
      res.end("hi");
    });
    await expect(api.get("/")).rejects.toMatchObject({ code: "bad_json" });
    server.close();
  });

  it("handles 4xx/5xx", async () => {
    const { api, server } = await setup((req: any, res: any) => {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "nope" }));
    });
    await expect(api.get("/")).rejects.toMatchObject({ status: 500, message: "nope" });
    server.close();
  });
});
