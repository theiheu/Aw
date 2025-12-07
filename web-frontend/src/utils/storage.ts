/**
 * LocalStorage Utilities
 * Helpers for managing data persistence
 */

import { STORAGE_KEYS, STORAGE_CONFIG } from '../constants/app';

/**
 * Load array data from localStorage with optional date field revival
 * @param key - LocalStorage key
 * @param mockData - Fallback data if not found
 * @param dateFields - Fields that should be converted from strings to Date objects
 * @returns Parsed data or mockData
 */
export function loadFromLocalStorage<T>(
  key: string,
  mockData: T[],
  dateFields: string[] = []
): T[] {
  try {
    const savedData = window.localStorage.getItem(key);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Revive date objects from strings
      if (dateFields.length > 0) {
        return parsedData.map((item: any) => {
          const newItem = { ...item };
          dateFields.forEach((field) => {
            if (newItem[field]) {
              newItem[field] = new Date(newItem[field]);
            }
          });
          return newItem;
        });
      }
      return parsedData;
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
  }
  return mockData;
}

/**
 * Load single object from localStorage
 * @param key - LocalStorage key
 * @param fallbackData - Fallback data if not found
 * @returns Parsed data or fallbackData
 */
export function loadObjectFromLocalStorage<T>(key: string, fallbackData: T): T {
  try {
    const savedData = window.localStorage.getItem(key);
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
  }
  return fallbackData;
}

/** Estimate current localStorage usage (in characters) */
function getLocalStorageUsage(): number {
  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const v = window.localStorage.getItem(k) || '';
    total += k.length + v.length;
  }
  return total;
}

/** Best-effort cleanup when nearing quota */
function cleanupIfNeeded() {
  try {
    const usage = getLocalStorageUsage();
    // Assume ~5MB quota => ~5,000,000 chars (rough estimate)
    const QUOTA = 5_000_000;
    if (usage / QUOTA >= STORAGE_CONFIG.CLEANUP_THRESHOLD) {
      // Prefer trimming tickets first (largest dataset)
      const rawTickets = window.localStorage.getItem(STORAGE_KEYS.TICKETS);
      if (rawTickets) {
        const arr = JSON.parse(rawTickets);
        if (Array.isArray(arr) && arr.length > STORAGE_CONFIG.MAX_TICKETS_STORED) {
          const trimmed = arr.slice(0, STORAGE_CONFIG.MAX_TICKETS_STORED);
          window.localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(trimmed));
        }
      }
    }
  } catch (e) {
    // No-op
  }
}

/**
 * Save data to localStorage with limits & cleanup
 * @param key - LocalStorage key
 * @param data - Data to save
 */
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    let toSave: any = data;

    // Enforce per-collection caps for known arrays
    if (key === STORAGE_KEYS.TICKETS && Array.isArray(data)) {
      toSave = (data as any[]).slice(0, STORAGE_CONFIG.MAX_TICKETS_STORED);
    }
    if (key === STORAGE_KEYS.CUSTOMERS && Array.isArray(data)) {
      toSave = (data as any[]).slice(0, STORAGE_CONFIG.MAX_CUSTOMERS_STORED);
    }

    window.localStorage.setItem(key, JSON.stringify(toSave));

    // Attempt cleanup if usage is high
    cleanupIfNeeded();
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage`, error);
  }
}

/**
 * Remove data from localStorage
 * @param key - LocalStorage key
 */
export function removeFromLocalStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage`, error);
  }
}

/**
 * Clear all localStorage data
 */
export function clearLocalStorage(): void {
  try {
    window.localStorage.clear();
  } catch (error) {
    console.error('Failed to clear localStorage', error);
  }
}

