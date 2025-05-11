import { Request, Response, NextFunction } from "express";

/**
 * 密碼驗證中間件
 * 檢查請求標頭中的密碼是否與環境變數中設置的密碼相符
 * 用法：將此中間件添加到需要保護的路由中
 */
export const passwordAuth = (req: Request, res: Response, next: NextFunction): void => {
    // 從請求標頭中獲取密碼
    const authPassword = req.headers["x-password"] as string;

    // 檢查密碼是否存在並與環境變數中的密碼相符
    if (!authPassword || authPassword !== process.env.PASSWORD) {
        res.status(401).json({
            success: false,
            message: "未授權：密碼錯誤或未提供",
        });
        return;
    }

    // 如果密碼正確，繼續執行下一個中間件或路由處理器
    next();
};
