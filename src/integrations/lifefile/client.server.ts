function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

const BASE_URL = requireEnv("LIFE_FILE_API_BASE_URL");
const API_USERNAME = requireEnv("LIFE_FILE_API_USERNAME");
const API_PASSWORD = requireEnv("LIFE_FILE_API_PASSWORD");
const VENDOR_ID = requireEnv("LIFE_FILE_VENDOR_ID");
const LOCATION_ID = requireEnv("LIFE_FILE_LOCATION_ID");
const API_NETWORK_ID = requireEnv("LIFE_FILE_API_NETWORK_ID");
export const PRACTICE_ID = Number(requireEnv("LIFE_FILE_PRACTICE_ID"));

if (!Number.isFinite(PRACTICE_ID) || PRACTICE_ID <= 0) {
  throw new Error("LIFE_FILE_PRACTICE_ID must be a positive number.");
}

export async function lifeFileRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
  } = {},
): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const auth = Buffer.from(
    `${API_USERNAME}:${API_PASSWORD}`,
  ).toString("base64");

  console.log("[Life File] HTTP request", {
    method: options.method ?? "GET",
    url,
    username: API_USERNAME,
    passwordLength: API_PASSWORD.length,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Vendor-ID": VENDOR_ID,
        "X-Location-ID": LOCATION_ID,
        "X-API-Network-ID": API_NETWORK_ID,
      },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
    });
  } catch (error) {
    const cause =
      error && typeof error === "object" && "cause" in error
        ? (error.cause as { code?: string; message?: string } | undefined)
        : undefined;
    const detail = cause?.code || cause?.message || (error as Error)?.message || "unknown error";
    throw new Error(
      `Could not reach Life File at ${url} (${detail}). If this is production, port 10165 may be blocked on this network.`,
    );
  }

  const text = await response.text();

  let payload: any;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Life File returned a non-JSON response (${response.status}): ${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Life File API error ${response.status}: ${
        payload?.message ?? text ?? "Unknown error"
      }`,
    );
  }

  if (payload?.type === "error") {
    throw new Error(
      payload.message ?? "Life File returned an error.",
    );
  }

  return payload as T;
}