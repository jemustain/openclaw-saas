"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./middleware/auth");
const health_1 = __importDefault(require("./routes/health"));
const openclaw_1 = __importDefault(require("./routes/openclaw"));
const heartbeat_1 = __importDefault(require("./routes/heartbeat"));
const skills_1 = __importDefault(require("./routes/skills"));
const messaging_1 = __importDefault(require("./routes/messaging"));
const usage_1 = __importDefault(require("./routes/usage"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '8787', 10);
app.use(express_1.default.json());
// Auth on all routes
app.use(auth_1.authMiddleware);
// Routes
app.use(health_1.default);
app.use(openclaw_1.default);
app.use(heartbeat_1.default);
app.use(skills_1.default);
app.use(messaging_1.default);
app.use(usage_1.default);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[sidecar] listening on port ${PORT}`);
});
exports.default = app;
