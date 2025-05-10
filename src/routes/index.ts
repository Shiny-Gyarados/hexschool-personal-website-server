import { Router } from "express";
// types
import type { Request, Response } from "express";

const router = Router();

router.get("/now", (req: Request, res: Response) => {
    try {
        const now = new Date().toISOString();
        res.status(200).json({ success: true, data: now });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error?.message ?? "Unknown Error" });
    }
});

export default router;
