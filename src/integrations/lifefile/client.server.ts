function readEnv(name: string): string {
  // Bracket access so Vite does not replace this with `undefined` at bundle time.
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

type LifeFileConfig = {
  baseUrl: string;
  apiUsername: string;
  apiPassword: string;
  vendorId: string;
  locationId: string;
  apiNetworkId: string;
  practiceId: number;
};

function getLifeFileConfig(): LifeFileConfig {
  const practiceId = Number(readEnv("LIFE_FILE_PRACTICE_ID"));
  if (!Number.isFinite(practiceId) || practiceId <= 0) {
    throw new Error("LIFE_FILE_PRACTICE_ID must be a positive number.");
  }
  return {
    baseUrl: readEnv("LIFE_FILE_API_BASE_URL"),
    apiUsername: readEnv("LIFE_FILE_API_USERNAME"),
    apiPassword: readEnv("LIFE_FILE_API_PASSWORD"),
    vendorId: readEnv("LIFE_FILE_VENDOR_ID"),
    locationId: readEnv("LIFE_FILE_LOCATION_ID"),
    apiNetworkId: readEnv("LIFE_FILE_API_NETWORK_ID"),
    practiceId,
  };
}

export function getPracticeId(): number {
  return getLifeFileConfig().practiceId;
}

export async function lifeFileRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
  } = {},
): Promise<T> {
  const config = getLifeFileConfig();
  const url = `${config.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const auth = Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString("base64");

  console.log("[Life File] HTTP request", {
    method: options.method ?? "GET",
    url,
    username: config.apiUsername,
    passwordLength: config.apiPassword.length,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Vendor-ID": config.vendorId,
        "X-Location-ID": config.locationId,
        "X-API-Network-ID": config.apiNetworkId,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
      `Life File API error ${response.status}: ${payload?.message ?? text ?? "Unknown error"}`,
    );
  }

  if (payload?.type === "error") {
    throw new Error(payload.message ?? "Life File returned an error.");
  }

  return payload as T;
}
