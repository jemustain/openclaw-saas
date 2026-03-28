declare const router: import("express-serve-static-core").Router;
/** Exported for heartbeat to include usage data when phoning home */
export declare function getTodayUsageSummary(): Promise<{
    messages_sent: number;
    hours_active: number;
    api_tokens_used: number;
}>;
export default router;
