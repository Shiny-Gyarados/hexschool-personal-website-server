import { db } from "../drizzle/db";

async function clearTableData(tableName: string) {
    try {
        const deleteDatasql = `
            DELETE FROM '${tableName}';
        `;
        const resetAutoIncrementSql = `
            DELETE FROM sqlite_sequence WHERE name = '${tableName}';
        `;
        await db.run(deleteDatasql);
        await db.run(resetAutoIncrementSql);
        console.log("clear table data done");
    } catch (error: any) {
        console.log("error: ", error);
    }
}

export default clearTableData;
