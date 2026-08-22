const app = require("./server_netlify");
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("============================================");
  console.log("LUKAFILMES ONLINE");
  console.log("PORTA: " + PORT);
  console.log("============================================");
});
