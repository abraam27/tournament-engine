import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  mongoDB: {
    mongoUri: process.env.MONGODB_URI ?? '',
  },
}));
