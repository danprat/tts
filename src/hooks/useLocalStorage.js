import { useState, useEffect } from 'react';

/**
 * Custom hook untuk localStorage dengan fallback yang aman
 */
export const useLocalStorage = (key, initialValue) => {
  // State untuk menyimpan value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Ambil dari localStorage
      const item = window.localStorage.getItem(key);
      // Parse JSON atau return initial value
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Jika error, return initial value
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return wrapped version dari useState's setter function yang persists nilai ke localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function untuk API yang sama dengan useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save ke state
      setStoredValue(valueToStore);
      
      // Save ke localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Error saat menyimpan ke localStorage
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

/**
 * Hook untuk menyimpan preferensi user voice selection
 */
export const useVoicePreference = () => {
  return useLocalStorage('gemini-tts-voice', 'Kore');
};

/**
 * Hook untuk menyimpan text terakhir yang digunakan (optional)
 */
export const useLastText = () => {
  return useLocalStorage('gemini-tts-last-text', '');
}; 