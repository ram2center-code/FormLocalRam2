import { AuthService } from './auth.service.js';
const getClientMeta = (req) => ({
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
});
const isCrossDomain = process.env.COOKIE_CROSS_DOMAIN === 'true';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || isCrossDomain,
    sameSite: (isCrossDomain ? 'none' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
    path: '/',
};
export class AuthController {
    static async login(req, res) {
        try {
            const meta = getClientMeta(req);
            const result = await AuthService.login(req.body, meta);
            // บันทึก refreshToken ลง httpOnly cookie ปลอดภัยจาก XSS
            res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
            res.status(200).json({
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ',
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                },
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error.message || 'เข้าสู่ระบบไม่สำเร็จ',
            });
        }
    }
    static async refresh(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                res.status(401).json({
                    success: false,
                    code: 'NO_REFRESH_TOKEN',
                    message: 'ไม่พบ Refresh Token ใน Cookie กรุณาเข้าสู่ระบบใหม่',
                });
                return;
            }
            const result = await AuthService.refresh(refreshToken);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            // เมื่อ refresh token ล้มเหลว ให้เคลียร์ cookie ทิ้งด้วย
            res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
            res.status(401).json({
                success: false,
                code: 'REFRESH_FAILED',
                message: error.message || 'การต่ออายุ Token ล้มเหลว',
            });
        }
    }
    static async logout(req, res) {
        try {
            const meta = getClientMeta(req);
            await AuthService.logout(req.user?.id, meta);
            res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
            res.status(200).json({
                success: true,
                message: 'ออกจากระบบสำเร็จ',
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
            });
        }
    }
    static async me(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'กรุณาเข้าสู่ระบบก่อน',
                });
                return;
            }
            const user = await AuthService.getMe(req.user.id);
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            res.status(404).json({
                success: false,
                message: error.message || 'ไม่พบข้อมูลผู้ใช้',
            });
        }
    }
}
