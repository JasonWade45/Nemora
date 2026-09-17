const QUEUE_KEY = "nemora_offline_visits";

export type OfflineAction = {
  id: string;
  type: "check_in" | "check_out";
  visitId: string;
  payload: any;
  timestamp: number;
};

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToOfflineQueue(action: Omit<OfflineAction, "id" | "timestamp">): OfflineAction {
  const queue = getOfflineQueue();
  const item: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("offline-queue-updated"));
  return item;
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter((a) => a.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("offline-queue-updated"));
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new Event("offline-queue-updated"));
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateTimeKm(distanceKm: number): number {
  return Math.round(distanceKm * 4);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export function formatEta(minutes: number): string {
  if (minutes < 1) return "أقل من دقيقة";
  if (minutes < 60) return `${minutes} دقايق`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} س ${m} د` : `${h} ساعة`;
}
