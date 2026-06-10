import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? '',
  audience: process.env.JWT_TOKEN_AUDIENCE ?? '',
  issuer: process.env.JWT_TOKEN_ISSUER ?? '',
  ttl: process.env.JWT_TOKEN_TTL
    ? parseInt(process.env.JWT_TOKEN_TTL, 10)
    : 3600,
  refreshTtl: process.env.JWT_REFRESH_TOKEN_TTL
    ? parseInt(process.env.JWT_REFRESH_TOKEN_TTL, 10)
    : 86400,
}));
