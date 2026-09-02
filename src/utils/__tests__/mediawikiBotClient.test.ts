import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaWikiBotClient } from "../mediawikiBotClient";

const CREDENTIALS = {
   username: "Bot@MyBotPassword",
   password: "supersecret-botpassword",
};

const API_URL = "http://localhost:8080/w/api.php";

/** Decodes an application/x-www-form-urlencoded body string into a record. */
function decodeForm(body: BodyInit | null | undefined): Record<string, string> {
   if (!body) return {};
   if (typeof body !== "string") return {};
   return Object.fromEntries(new URLSearchParams(body).entries());
}

/** Decodes multipart form bodies (used by upload). */
function decodeMultipart(form: FormData): Record<string, unknown> {
   const out: Record<string, unknown> = {};
   form.forEach((value, key) => {
      out[key] = value;
   });
   return out;
}

type UploadHandler = (form: Record<string, unknown>, cookies: string) => Record<string, unknown>;

interface MockOptions {
   logintoken?: string;
   csrftoken?: string;
   loginResult?: Record<string, unknown>;
   queryPages?: () => Record<string, unknown>;
   upload?: UploadHandler;
}

/**
 * A global.fetch mock that dispatches on the request body/URL, recording calls.
 */
function mockFetch(opts: MockOptions) {
   const calls: {
      url: string;
      method: string | undefined;
      form: Record<string, string>;
      multipart: Record<string, unknown>;
      cookies: string;
   }[] = [];
   const fetchCookie = (init?: RequestInit) => {
      const headers = init?.headers as unknown as Record<string, string>;
      return headers?.["Cookie"] ?? headers?.["cookie"] ?? "";
   };
   const parseUrlQuery = (url: string): Record<string, string> => {
      const qIndex = url.indexOf("?");
      if (qIndex === -1) return {};
      return Object.fromEntries(new URLSearchParams(url.slice(qIndex + 1)).entries());
   };

   const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const isMultipart = init?.body instanceof FormData;
      const bodyForm: Record<string, string> = isMultipart
         ? {}
         : decodeForm(init?.body as string | null | undefined);
      const multipart: Record<string, unknown> = isMultipart
         ? decodeMultipart(init.body as unknown as FormData)
         : {};
      // Combine body params with URL query params so GET query requests dispatch too.
      const form: Record<string, string> = { ...parseUrlQuery(url), ...bodyForm };
      const cookies = fetchCookie(init);

      calls.push({
         url,
         method: init?.method,
         form,
         multipart,
         cookies,
      });

      const json = (data: unknown) =>
         new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
         });

      // Login token
      if (form["action"] === "query" && form["meta"] === "tokens" && form["type"] === "login") {
         return json({
            query: { tokens: { logintoken: opts.logintoken ?? "login123" } },
         });
      }
      // Login
      if (form["action"] === "login") {
         return json(opts.loginResult ?? { login: { result: "Success" } });
      }
      // CSRF token
      if (form["action"] === "query" && form["meta"] === "tokens" && form["type"] === "csrf") {
         return json({
            query: { tokens: { csrftoken: opts.csrftoken ?? "csrf123" } },
         });
      }
      // Upload (multipart)
      if (isMultipart && multipart["action"] === "upload") {
         return json(opts.upload?.(multipart, cookies) ?? { upload: { result: "Success", filename: "X.jpg" } });
      }
      // File existence query
      if (form["action"] === "query" && url.includes("titles=") && isMultipart === false) {
         return json({ query: { pages: opts.queryPages?.() ?? {} } });
      }
      return json({});
   });

   const fetchImpl: typeof globalThis.fetch = fn as unknown as typeof globalThis.fetch;
   globalThis.fetch = fetchImpl;
   return { fn, calls };
}

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
   globalThis.fetch = undefined as unknown as typeof globalThis.fetch;
});

function withSession(client: MediaWikiBotClient) {
   (client as unknown as { cookieJar: Map<string, string> }).cookieJar.set("session", "abc123");
}

describe("MediaWikiBotClient", () => {
   it("performs the login-token -> login flow with bot credentials", async () => {
      const { fn, calls } = mockFetch({});

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      await client.login();

      const tokenCall = calls[0];
      expect(tokenCall.form["action"]).toBe("query");
      expect(tokenCall.form["type"]).toBe("login");

      const loginCall = calls[1];
      expect(loginCall.form["action"]).toBe("login");
      expect(loginCall.form["lgname"]).toBe("Bot@MyBotPassword");
      expect(loginCall.form["lgpassword"]).toBe("supersecret-botpassword");
      expect(loginCall.form["lgtoken"]).toBe("login123");
      expect(fn).toHaveBeenCalledTimes(2);
   });

   it("uses the retained session cookie for the CSRF token request", async () => {
      const { fn } = mockFetch({});
      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      withSession(client);

      await client.getCsrfToken();

      const csrfCall = fn.mock.calls[0] as [unknown, RequestInit];
      const headers = csrfCall[1]?.headers as unknown as Record<string, string>;
      expect(headers["Cookie"]).toContain("session=abc123");
   });

   it("never logs or returns the bot password", async () => {
      const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({
         upload: () => ({ error: { code: "uploaddisabled", info: "Upload is disabled" } }),
      });

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      withSession(client);

      await expect(
         client.upload(
            { name: "Test.jpg", buffer: Buffer.from("x"), mimetype: "image/jpeg" },
            { text: "wikitext" },
         ),
      ).rejects.toThrow();

      const output = logSpy.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(output).not.toContain("supersecret-botpassword");
      expect(output).not.toContain("lgpassword");
      expect(output).not.toContain("MyBotPassword");
   });

   it("uploads to the configured local API URL with the session", async () => {
      const { calls } = mockFetch({
         upload: () => ({ upload: { result: "Success", filename: "Test.jpg" } }),
      });

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      withSession(client);

      const result = await client.upload(
         { name: "Test.jpg", buffer: Buffer.from("x"), mimetype: "image/jpeg" },
         { text: "wikitext" },
      );

      expect(result.upload.filename).toBe("Test.jpg");
      const uploadCall = calls.find((c) => c.multipart["action"] === "upload")!;
      expect(uploadCall.url).toBe(API_URL);
      expect(uploadCall.cookies).toContain("session=abc123");
      // ignorewarnings must NOT be set.
      expect(uploadCall.multipart["ignorewarnings"]).toBeUndefined();
   });

   it("rejects an existing title with the expected warning code", async () => {
      mockFetch({
         upload: () => ({
            upload: {
               result: "Warning",
               warnings: { exists: "File:Test.jpg already exists" },
            },
         }),
      });

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      withSession(client);

      await expect(
         client.upload(
            { name: "Test.jpg", buffer: Buffer.from("x"), mimetype: "image/jpeg" },
            { text: "wikitext" },
         ),
      ).rejects.toMatchObject({ code: "exists" });
   });

   it("raises a safe error when bot login fails", async () => {
      const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ loginResult: { login: { result: "Failed", reason: "botpassword" } } });

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      await expect(client.login()).rejects.toMatchObject({ code: "login-failed" });

      const output = logSpy.mock.calls.map((c) => JSON.stringify(c)).join("\n");
      expect(output).not.toContain("supersecret-botpassword");
   });

   it("checks file existence against the local API and session", async () => {
      const { calls } = mockFetch({
         queryPages: () => ({
            "1": { title: "File:Monument 1.jpg" },
            "2": { missing: "", title: "File:Monument 2.jpg" },
         }),
      });

      const client = new MediaWikiBotClient(API_URL, CREDENTIALS);
      withSession(client);

      const existing = await client.checkFileExistence(["Monument 1", "Monument 2"]);
      expect(existing).toEqual(["Monument 1"]);

      const queryCall = calls.find((c) => c.url.includes("titles="))!;
      expect(queryCall.url.startsWith(API_URL)).toBe(true);
      expect(queryCall.cookies).toContain("session=abc123");
   });
});
