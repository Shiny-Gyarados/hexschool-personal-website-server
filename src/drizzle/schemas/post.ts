import { sqliteTable, text, blob, integer, uniqueIndex, unique, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { id } from "../schemaUtils";
import type { Frontmatter } from "../../../types";

export const PostTable = sqliteTable("post", {
    id,
    frontmatter: text("frontmatter", { mode: "json" }).$type<Frontmatter>(),
    content: blob("content", { mode: "buffer" }),
});
