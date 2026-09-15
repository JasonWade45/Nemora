/**
 * Offline Storage using IndexedDB for PharmaTrack
 * Handles offline visits, orders, and sync when online
 */

interface OfflineVisit {
  id: string;
  doctorId: string;
  visitPurpose: string;
  latitude: number;
  longitude: number;
  distanceFromDoctor: number;
  isVerified: boolean;
  notes?: string;
  doctorResponse?: string;
  products?: string[];
  nextFollowUpDate?: string;
  nextFollowUpType?: string;
  nextFollowUpNotes?: string;
  startTime: string;
  createdAt: string;
  synced: boolean;
}

interface OfflineOrder {
  id: string;
  doctorId: string;
  items: Array<{ productId: string; quantity: number }>;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

interface OfflineFollowUp {
  id: string;
  doctorId: string;
  dueDate: string;
  actionType: string;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

const DB_NAME = 'PharmaTrackOffline';
const DB_VERSION = 1;

const STORES = {
  VISITS: 'visits',
  ORDERS: 'orders',
  FOLLOW_UPS: 'followUps',
  CONNECTIVITY: 'connectivity',
} as const;

interface ConnectivityEntry {
  id: string;
  timestamp: number;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  synced: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.VISITS)) {
        const visitStore = db.createObjectStore(STORES.VISITS, { keyPath: 'id' });
        visitStore.createIndex('synced', 'synced', { unique: false });
        visitStore.createIndex('doctorId', 'doctorId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        orderStore.createIndex('synced', 'synced', { unique: false });
        orderStore.createIndex('doctorId', 'doctorId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FOLLOW_UPS)) {
        const followUpStore = db.createObjectStore(STORES.FOLLOW_UPS, { keyPath: 'id' });
        followUpStore.createIndex('synced', 'synced', { unique: false });
        followUpStore.createIndex('doctorId', 'doctorId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CONNECTIVITY)) {
        db.createObjectStore(STORES.CONNECTIVITY, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// Generic CRUD operations
async function addItem<T extends { id: string; synced: boolean }>(
  storeName: string,
  item: T
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateItem<T extends { id: string }>(
  storeName: string,
  item: T
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getUnsyncedItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('synced');
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Visit operations
export async function saveOfflineVisit(visit: OfflineVisit): Promise<void> {
  await addItem(STORES.VISITS, visit);
}

export async function getOfflineVisits(): Promise<OfflineVisit[]> {
  return getAllItems(STORES.VISITS);
}

export async function getUnsyncedVisits(): Promise<OfflineVisit[]> {
  return getUnsyncedItems(STORES.VISITS);
}

export async function markVisitSynced(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.VISITS, 'readwrite');
    const store = transaction.objectStore(STORES.VISITS);
    const request = store.get(id);
    request.onsuccess = () => {
      const visit = request.result;
      if (visit) {
        visit.synced = true;
        const updateRequest = store.put(visit);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Order operations
export async function saveOfflineOrder(order: OfflineOrder): Promise<void> {
  await addItem(STORES.ORDERS, order);
}

export async function getOfflineOrders(): Promise<OfflineOrder[]> {
  return getAllItems(STORES.ORDERS);
}

export async function getUnsyncedOrders(): Promise<OfflineOrder[]> {
  return getUnsyncedItems(STORES.ORDERS);
}

export async function markOrderSynced(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ORDERS, 'readwrite');
    const store = transaction.objectStore(STORES.ORDERS);
    const request = store.get(id);
    request.onsuccess = () => {
      const order = request.result;
      if (order) {
        order.synced = true;
        const updateRequest = store.put(order);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Follow-up operations
export async function saveOfflineFollowUp(followUp: OfflineFollowUp): Promise<void> {
  await addItem(STORES.FOLLOW_UPS, followUp);
}

export async function getOfflineFollowUps(): Promise<OfflineFollowUp[]> {
  return getAllItems(STORES.FOLLOW_UPS);
}

export async function getUnsyncedFollowUps(): Promise<OfflineFollowUp[]> {
  return getUnsyncedItems(STORES.FOLLOW_UPS);
}

export async function markFollowUpSynced(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FOLLOW_UPS, 'readwrite');
    const store = transaction.objectStore(STORES.FOLLOW_UPS);
    const request = store.get(id);
    request.onsuccess = () => {
      const followUp = request.result;
      if (followUp) {
        followUp.synced = true;
        const updateRequest = store.put(followUp);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Connectivity logging
export async function logConnectivity(isOnline: boolean, location?: { latitude: number; longitude: number }): Promise<void> {
  const entry: ConnectivityEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    isOnline,
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
    synced: true,
  };
  await addItem(STORES.CONNECTIVITY, entry);
}

export async function getConnectivityLogs(): Promise<Array<{ id: string; timestamp: number; isOnline: boolean }>> {
  return getAllItems(STORES.CONNECTIVITY);
}

// Sync functions
export async function syncAll(): Promise<{ visits: number; orders: number; followUps: number }> {
  let visitsSynced = 0;
  let ordersSynced = 0;
  let followUpsSynced = 0;

  // Sync visits
  const unsyncedVisits = await getUnsyncedVisits();
  for (const visit of unsyncedVisits) {
    try {
      const res = await fetch('/api/visits/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visit),
      });
      if (res.ok) {
        await markVisitSynced(visit.id);
        visitsSynced++;
      }
    } catch {
      // Will retry later
    }
  }

  // Sync orders
  const unsyncedOrders = await getUnsyncedOrders();
  for (const order of unsyncedOrders) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        await markOrderSynced(order.id);
        ordersSynced++;
      }
    } catch {
      // Will retry later
    }
  }

  // Sync follow-ups
  const unsyncedFollowUps = await getUnsyncedFollowUps();
  for (const followUp of unsyncedFollowUps) {
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUp),
      });
      if (res.ok) {
        await markFollowUpSynced(followUp.id);
        followUpsSynced++;
      }
    } catch {
      // Will retry later
    }
  }

  return { visits: visitsSynced, orders: ordersSynced, followUps: followUpsSynced };
}

// Online/offline detection
export function setupOnlineDetection(onOnline?: () => void, onOffline?: () => void): () => void {
  const handleOnline = () => {
    logConnectivity(true);
    onOnline?.();
    // Auto-sync when coming online
    syncAll();
  };

  const handleOffline = () => {
    logConnectivity(false);
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial check
  if (navigator.onLine) {
    logConnectivity(true);
  } else {
    logConnectivity(false);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Get storage usage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await (navigator.storage as any).estimate();
    return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
  }
  return null;
}