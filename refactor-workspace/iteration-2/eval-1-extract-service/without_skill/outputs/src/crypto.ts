export async function hashPassword(password: string): Promise<string> { return 'hashed'; }
export async function verifyPassword(password: string, hash: string): Promise<boolean> { return true; }
export function generateToken(userId: string): string { return 'token'; }
