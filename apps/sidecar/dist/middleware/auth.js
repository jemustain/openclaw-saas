"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
function authMiddleware(req, res, next) {
    const token = process.env.SIDECAR_TOKEN;
    if (!token) {
        res.status(500).json({ error: 'SIDECAR_TOKEN not configured' });
        return;
    }
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
