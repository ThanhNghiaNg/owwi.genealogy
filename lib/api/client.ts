export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  bodyJson?: unknown;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined = options.body ?? undefined;
  if (options.bodyJson !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.bodyJson);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, "INVALID_RESPONSE", "Server returned invalid JSON");
    }
  }

  if (!response.ok) {
    const errorObj = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      response.status,
      errorObj?.code ?? "REQUEST_FAILED",
      errorObj?.message ?? "Request failed",
      errorObj?.details
    );
  }

  return data as T;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  hasGoogleLinked: boolean;
}

export interface TreeSnapshot {
  persons: Array<{
    id: string;
    name: string;
    gender: "male" | "female";
    birthYear: number | null;
    nickname: string | null;
    phone: string | null;
    address: string | null;
    isDeceased: boolean;
    createdAt: number;
  }>;
  relationships: Array<{
    id: string;
    type: "parent" | "spouse";
    person1Id: string;
    person2Id: string;
    orderIndex: number;
  }>;
}

export const apiClient = {
  requestOtp(email: string) {
    return request<{ success: true }>("/api/auth/request-otp", {
      method: "POST",
      bodyJson: { email },
    });
  },

  verifyOtp(email: string, otp: string) {
    return request<{ success: true; user: AuthUserResponse }>("/api/auth/verify-otp", {
      method: "POST",
      bodyJson: { email, otp },
    });
  },

  me() {
    return request<{ authenticated: true; user: AuthUserResponse }>("/api/auth/me", {
      method: "GET",
    });
  },

  logout() {
    return request<{ success: true }>("/api/auth/logout", {
      method: "POST",
    });
  },

  getTree() {
    return request<TreeSnapshot>("/api/tree", {
      method: "GET",
    });
  },

  replaceTree(snapshot: TreeSnapshot) {
    return request<TreeSnapshot>("/api/tree", {
      method: "PUT",
      bodyJson: snapshot,
    });
  },

  sync(snapshot: TreeSnapshot) {
    return request<TreeSnapshot>("/api/sync", {
      method: "POST",
      bodyJson: snapshot,
    });
  },
};
