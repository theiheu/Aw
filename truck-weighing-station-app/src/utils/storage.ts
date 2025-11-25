/**
 * LocalStorage Utilities
 * Helpers for managing data persistence
 */

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

/**
 * Save data to localStorage
 * @param key - LocalStorage key
 * @param data - Data to save
 */
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
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

