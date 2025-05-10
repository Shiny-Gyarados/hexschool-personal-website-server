import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./db";
import path from "path";

export const runMigrate = async () => {
    migrate(db, {
        migrationsFolder: path.join(__dirname, "migrations"),
        migrationsSchema: path.join(__dirname, "schema"),
    });
};
