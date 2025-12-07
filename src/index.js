import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });
connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
    server.on("error", (err) => {
      console.error("EXPRESS SERVER FAILURE: Could not bind to port :", err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("MONGO DB connnection failed !!!", err);
  });
