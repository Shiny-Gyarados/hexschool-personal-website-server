import clearTableData from "./src/scripts/clearTableData";

async function main() {
    try {
        await clearTableData("post");
    } catch (error: any) {
        console.log("error: ", error);
    }
}

main();
