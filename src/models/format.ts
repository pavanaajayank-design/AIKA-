import { DateTime } from 'luxon';
export const duration = (n: number) => `${Math.floor(Math.max(0, n) / 60)}h ${Math.max(0, n) % 60 ? Math.max(0, n) % 60 + 'm' : ''}`;
export const time = (n: number, z = 'Asia/Kolkata') => DateTime.fromMillis(n, { zone: z }).toFormat('HH:mm');
