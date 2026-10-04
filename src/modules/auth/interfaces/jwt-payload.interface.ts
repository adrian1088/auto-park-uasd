import { UserRole } from "../../users/enums/users-role.enum";

export interface JwtAccessPayload {
  sub: number; // userId
  issuer?: string; // Optional field to indicate the issuer of the token
  audience?: string; // Optional field to indicate the audience of the token
  iat?: number; // Optional field for issued at timestamp
  exp?: number; // Optional field for expiration timestamp
  name?: string; // Optional field for user's full name
  email?: string; // Optional field for user's email
  role: UserRole;
  type: 'access'; // Optional field to indicate the type of token (access or refresh)
  jti?: string; // Optional field for JWT ID, useful for refresh tokens
}


export interface JwtRefreshPayload {
  sub: number; // userId
  issuer?: string; // Optional field to indicate the issuer of the token
  audience?: string; // Optional field to indicate the audience of the token
  iat?: number; // Optional field for issued at timestamp
  exp?: number; // Optional field for expiration timestamp
  type: 'refresh'; // Type is always 'refresh' for refresh tokens
  jti?: string; // Optional field for JWT ID, useful for refresh tokens
}