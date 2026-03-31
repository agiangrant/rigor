import { createClient } from 'redis';
// Currently used only for session storage
export const redis = createClient({ url: process.env.REDIS_URL });
