import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";
import { slackRouter } from "./routes/slack.js";
const app = express();
app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({
    verify: (request, _response, buffer) => {
        request.rawBody = buffer.toString("utf8");
    }
}));
app.use(express.urlencoded({ extended: true }));
app.get("/health", (_request, response) => {
    response.json({ ok: true });
});
app.use("/auth", (request, response, next) => {
    if (request.path === "/session") {
        requireAuth(request, response, next);
        return;
    }
    next();
}, authRouter);
app.use("/api", requireAuth, apiRouter);
app.use("/slack", slackRouter);
app.listen(env.PORT, () => {
    console.log(`Virtual Office server listening on http://localhost:${env.PORT}`);
});
