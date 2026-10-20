import rateLimit from 'express-rate-limit';
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 10, // จำกัดไม่เกิน 10 ครั้งต่อ IP ใน 15 นาที
    standardHeaders: true, // ส่ง Draft-6 RateLimit-* headers
    legacyHeaders: false, // ปิด X-RateLimit-* headers
    message: {
        success: false,
        message: 'มีการพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง',
    },
});
