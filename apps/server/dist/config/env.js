import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
    SESSION_COOKIE_NAME: z.string().default("virtual_office_session"),
    SLACK_CLIENT_ID: z.string().optional().default(""),
    SLACK_CLIENT_SECRET: z.string().optional().default(""),
    SLACK_SIGNING_SECRET: z.string().optional().default(""),
    SLACK_BOT_TOKEN: z.string().optional().default(""),
    SLACK_REDIRECT_URI: z.string().default("http://localhost:4000/auth/slack/callback"),
    SLACK_DEFAULT_CHANNEL: z.string().default("virtual-office"),
    ENABLE_SLACK_MOCK: z
        .string()
        .default("true")
        .transform((value) => value === "true")
});
export const env = envSchema.parse(process.env);
export const isSlackConfigured = Boolean(env.SLACK_CLIENT_ID &&
    env.SLACK_CLIENT_SECRET &&
    env.SLACK_SIGNING_SECRET);
