import { sqliteTable, text, integer, uniqueIndex, unique, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const id = integer("id", { mode: "number" }).primaryKey({ autoIncrement: true });

export const uid = text("uid")
    .primaryKey()
    .$defaultFn(() => uuidv4());

export const createdAt = integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull();

export const updatedAt = integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date());
