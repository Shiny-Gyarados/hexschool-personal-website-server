import { Router } from "express";
import { db } from "../drizzle/db";
import matter from "gray-matter";
import { PostTable } from "../drizzle/schema";
import upload from "../modules/upload";
import { eq, and, desc, asc, sql, or, lt, gt } from "drizzle-orm";
import { passwordAuth } from "../modules/auth";
// types
import type { Request, Response } from "express";
import type { Frontmatter, RequestParams, RequestQuery } from "~/types";

// multer 類型定義
interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

const router = Router();

router.get("/article/:id", async (req: RequestParams<{ id?: string }>, res: Response) => {
    try {
        const id = parseInt(req.params?.id + "", 10);
        if (!req.params.id || Number.isNaN(id)) {
            res.status(400).json({ success: false, message: "Invalid ID format" });
            return;
        }

        // 使用 Promise.all 同時執行三個查詢
        const [posts, prevPost, nextPost] = await Promise.all([
            // 查詢當前文章
            db.query.PostTable.findMany({
                where: eq(PostTable.id, id),
            }),
            // 查詢前一篇文章
            db
                .select({ id: PostTable.id })
                .from(PostTable)
                .where(lt(PostTable.id, id))
                .orderBy(desc(PostTable.id))
                .limit(1),
            // 查詢後一篇文章
            db
                .select({ id: PostTable.id })
                .from(PostTable)
                .where(gt(PostTable.id, id))
                .orderBy(asc(PostTable.id))
                .limit(1),
        ]);

        if (!Array.isArray(posts) || posts.length === 0) {
            res.status(404).json({ success: false, message: "Post not found" });
            return;
        }

        const prevId = prevPost.length > 0 ? prevPost[0].id : null;
        const nextId = nextPost.length > 0 ? nextPost[0].id : null;

        const data = {
            ...posts[0],
            content: posts[0]?.content?.toString() ?? "",
            prevId,
            nextId,
        };
        res.status(200).json({ success: true, message: "", data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error?.message ?? "Unknown Error" });
    }
});

// POST 方法用於創建新的文章
router.post("/", passwordAuth, upload.single("markdown"), async (req: RequestWithFile, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "No file uploaded or file type not allowed",
            });
            return;
        }

        // 從 buffer 中獲取檔案內容
        const fileContent = req.file.buffer;

        // 從 markdown 檔案內容中解析 frontmatter
        const source = fileContent.toString();
        const { data } = matter(source);

        // 插入資料庫
        const result = await db
            .insert(PostTable)
            .values({
                frontmatter: data as Frontmatter,
                content: fileContent, // 存儲整個檔案內容作為 buffer (blob)
            })
            .returning({ id: PostTable.id });

        res.status(201).json({
            success: true,
            message: "Markdown file successfully added to the database",
            data: result[0],
        });
    } catch (error: any) {
        console.error("Error adding file:", error);
        res.status(500).json({
            success: false,
            message: error?.message ?? "Unknown Error",
        });
    }
});

// DELETE 方法用於刪除指定 id 的文章
router.delete("/:id", passwordAuth, async (req: RequestParams<{ id: string }>, res: Response) => {
    try {
        const id = parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid ID format",
            });
            return;
        }

        // 直接刪除並獲取刪除結果
        const result = await db.delete(PostTable).where(eq(PostTable.id, id)).returning({ id: PostTable.id });

        if (result.length === 0) {
            res.status(404).json({
                success: false,
                message: "Post not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Post successfully deleted",
            data: { id },
        });
    } catch (error: any) {
        console.error("Error deleting post:", error);
        res.status(500).json({
            success: false,
            message: error?.message ?? "Unknown Error",
        });
    }
});

// GET 方法用於取得文章列表，支援篩選、分頁和指定欄位
router.get(
    "/list",
    async (
        req: RequestQuery<{
            page?: string;
            limit?: string;
            title?: string;
            description?: string;
            search?: string;
            category?: string;
            tag?: string;
            sort?: string;
            order?: "asc" | "desc";
        }>,
        res
    ) => {
        try {
            const page = parseInt(req.query.page || "1", 10);
            const limit = parseInt(req.query.limit || "10", 10);
            const offset = (page - 1) * limit;
            const title = req.query.title;
            const description = req.query.description;
            const search = req.query.search;
            const category = req.query.category;
            const tag = req.query.tag;
            const sortField = req.query.sort || "id";
            const sortOrder = req.query.order || "desc";

            // 構建 where 條件
            let whereConditions = [];

            if (title) {
                whereConditions.push(sql`json_extract(${PostTable.frontmatter}, '$.title') LIKE ${"%" + title + "%"}`);
            }

            if (description) {
                whereConditions.push(
                    sql`json_extract(${PostTable.frontmatter}, '$.description') LIKE ${"%" + description + "%"}`
                );
            }

            if (search) {
                whereConditions.push(
                    or(
                        sql`json_extract(${PostTable.frontmatter}, '$.title') LIKE ${"%" + search + "%"}`,
                        sql`json_extract(${PostTable.frontmatter}, '$.description') LIKE ${"%" + search + "%"}`
                    )
                );
            }

            if (category) {
                whereConditions.push(sql`json_extract(${PostTable.frontmatter}, '$.category') = ${category}`);
            }

            if (tag) {
                whereConditions.push(sql`json_extract(${PostTable.frontmatter}, '$.tags') LIKE ${"%" + tag + "%"}`);
            }

            // 構建查詢條件
            const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

            // 構建排序條件
            let orderByClause;
            if (sortField === "title") {
                orderByClause =
                    sortOrder === "asc"
                        ? asc(sql`json_extract(${PostTable.frontmatter}, '$.title')`)
                        : desc(sql`json_extract(${PostTable.frontmatter}, '$.title')`);
            } else if (sortField === "category") {
                orderByClause =
                    sortOrder === "asc"
                        ? asc(sql`json_extract(${PostTable.frontmatter}, '$.category')`)
                        : desc(sql`json_extract(${PostTable.frontmatter}, '$.category')`);
            } else if (sortField === "date") {
                orderByClause =
                    sortOrder === "asc"
                        ? asc(sql`json_extract(${PostTable.frontmatter}, '$.date')`)
                        : desc(sql`json_extract(${PostTable.frontmatter}, '$.date')`);
            } else {
                // 默認按 id 排序
                orderByClause = sortOrder === "asc" ? asc(PostTable.id) : desc(PostTable.id);
            }

            // 查詢總數以計算分頁
            const countResult = await db
                .select({
                    count: sql`count(*)`.as("count"),
                })
                .from(PostTable)
                .where(whereClause);
            const totalCount = Number(countResult[0].count);
            const totalPages = Math.ceil(totalCount / limit);

            // 查詢文章列表
            const posts = await db
                .select({
                    id: PostTable.id,
                    frontmatter: PostTable.frontmatter,
                })
                .from(PostTable)
                .where(whereClause)
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);

            res.status(200).json({
                success: true,
                message: "",
                data: posts,
                pagination: {
                    total: totalCount,
                    totalPages,
                    currentPage: page,
                    limit,
                },
            });
        } catch (error: any) {
            console.error("Error fetching posts:", error);
            res.status(500).json({
                success: false,
                message: error?.message ?? "Unknown Error",
            });
        }
    }
);

export default router;
