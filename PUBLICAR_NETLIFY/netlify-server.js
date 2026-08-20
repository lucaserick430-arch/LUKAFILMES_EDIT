const app = require("./server_netlify");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("LUKAFILMES Netlify Dev Server: http://localhost:" + PORT);
});
