const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 10_000;

export function markProcessed(eventId: string): boolean {
  if (processedEvents.has(eventId)) return false;
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    const first = processedEvents.values().next().value;
    if (first) processedEvents.delete(first);
  }
  processedEvents.add(eventId);
  return true;
}

export { processedEvents };
