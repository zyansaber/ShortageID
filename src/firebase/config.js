import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, get } from 'firebase/database';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBn4IJp4Y58E8hoLr3qJ3RM7f3AJIxD1I4",
  authDomain: "partssr.firebaseapp.com",
  databaseURL: "https://partssr-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "partssr",
  storageBucket: "partssr.firebasestorage.app",
  messagingSenderId: "170192235843",
  appId: "1:170192235843:web:e94eb765a20081e7ae93f6",
  measurementId: "G-E99627W9KP"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

export const firebaseHelpers = {
  // Get shortage data for materials
  getShortageData: (callback) => {
    const shortageRef = ref(database, 'shortageID');
    return onValue(shortageRef, callback);
  },

  // Search materials
  searchMaterials: (searchTerm, callback) => {
    const shortageRef = ref(database, 'shortageID');
    return onValue(shortageRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const results = Object.entries(data).filter(([partCode, item]) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            partCode.toLowerCase().includes(searchLower) ||
            (item.Description || '').toLowerCase().includes(searchLower) ||
            (item.MaterialSummary || '').toLowerCase().includes(searchLower)
          );
        });
        callback(results);
      } else {
        callback([]);
      }
    });
  },

  // Get image URL from Firebase Storage
  getPartImage: async (partCode) => {
    try {
      const imageRef = storageRef(storage, `${partCode}.png`);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.log(`No image found for part code: ${partCode}`);
      return null;
    }
  },

  // Create shortage case
  createShortageCase: async (shortageData) => {
    const shortagesRef = ref(database, 'shortages');
    const newShortage = {
      ...shortageData,
      status: 'created', // Start with created status
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    return push(shortagesRef, newShortage);
  },

  // Get all shortage cases
  getShortages: (callback) => {
    const shortagesRef = ref(database, 'shortages');
    return onValue(shortagesRef, callback);
  },

  // Get single shortage case
  getShortage: async (shortageId) => {
    const shortageRef = ref(database, `shortages/${shortageId}`);
    const snapshot = await get(shortageRef);
    return snapshot.val();
  },

  // Update shortage case
  updateShortage: async (shortageId, updates) => {
    const shortageRef = ref(database, `shortages/${shortageId}`);
    return update(shortageRef, updates);
  }
};

export default app;