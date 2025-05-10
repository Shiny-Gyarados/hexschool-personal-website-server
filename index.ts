import app from "./src/app";

const PORT = process?.env?.PORT ?? "3300";

app.set("port", PORT);

app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
});