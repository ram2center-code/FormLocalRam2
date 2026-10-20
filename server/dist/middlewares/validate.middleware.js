import { ZodError } from 'zod';
export const validate = (schemas) => {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                res.status(400).json({
                    success: false,
                    message: 'ข้อมูลที่ส่งมาไม่ถูกต้องตามเงื่อนไข (Validation Error)',
                    errors: issues,
                });
                return;
            }
            res.status(400).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
            });
        }
    };
};
