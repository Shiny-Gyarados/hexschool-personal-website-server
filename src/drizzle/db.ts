import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const isDev = process.env.NODE_ENV === "development";

export const url = isDev ? `file:///${path.resolve(process.cwd(), "db/sqlite.db")}` : process.env.TURSO_URL!;
const authToken = isDev ? undefined : process.env.TURSO_TOKEN!;

export const db = drizzle({
    connection: {
        url: url,
        authToken: authToken,
    },
    schema,
    logger: true,
});
