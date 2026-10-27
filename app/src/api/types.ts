export interface User {
  id: number;
  email: string;
  display_name: string;
  date_joined: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthResponse extends TokenPair {
  user: User;
}

/** DRF validation errors: field name (or "detail" / "non_field_errors") → messages. */
export type ApiErrorBody = Record<string, string[] | string>;
