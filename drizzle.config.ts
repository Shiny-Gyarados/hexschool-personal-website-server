import { defineConfig } from "drizzle-kit";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const isDev = process.env.NODE_ENV === "development";

const url = isDev ? `file:///${path.resolve(process.cwd(), "db/sqlite.db")}` : process.env.TURSO_URL!;
const authToken = isDev ? undefined : process.env.TURSO_TOKEN!;

export default defineConfig({
    schema: "./src/drizzle/schema.ts",
    out: "./src/drizzle/migrations",
    dialect: "turso",
    dbCredentials: {
        url: url,
        authToken: authToken,
    },
    verbose: true,
    strict: true,
    migrations: {},
});
