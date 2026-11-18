// What we store inside the login token
export interface JwtPayload {
  sub: number; // user id
  username: string;
  role: string;
  workingYear: string; // e.g. "2026-2027"
}
