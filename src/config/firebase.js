// Firebase Admin SDK (for server-side operations like notifications)
const admin = require('firebase-admin');
const logger = require('../utils/logger');
const { FIREBASE_SERVICE_ACCOUNT, FIREBASE_DATABASE_URL } = require('./env');

// Firebase Client SDK (for client-side operations)
// Note: Some features may have limitations in Node.js environment
let firebaseClientApp = null;
let firestore = null;
let storage = null;
let auth = null;
let analytics = null;

// Firebase Client SDK Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const initializeFirebaseClient = () => {
  try {
    if (firebaseClientApp) {
      logger.info('Firebase Client SDK already initialized');
      return firebaseClientApp;
    }

    // Dynamically import Firebase client SDK modules
    const { initializeApp, getApps } = require('firebase/app');
    
    // Initialize Firebase app
    if (getApps().length === 0) {
      firebaseClientApp = initializeApp(firebaseConfig);
      logger.info('Firebase Client App initialized');
    } else {
      firebaseClientApp = getApps()[0];
      logger.info('Using existing Firebase Client App');
    }

    // Initialize Firebase services (with error handling for Node.js limitations)
    try {
      const { getFirestore } = require('firebase/firestore');
      firestore = getFirestore(firebaseClientApp);
      logger.info('Firestore initialized');
    } catch (error) {
      logger.warn('Firestore initialization warning:', error.message);
    }

    try {
      const { getStorage } = require('firebase/storage');
      storage = getStorage(firebaseClientApp);
      logger.info('Storage initialized');
    } catch (error) {
      logger.warn('Storage initialization warning:', error.message);
    }

    try {
      const { getAuth } = require('firebase/auth');
      auth = getAuth(firebaseClientApp);
      logger.info('Auth initialized');
    } catch (error) {
      logger.warn('Auth initialization warning:', error.message);
    }

    // Analytics is browser-only, skip in Node.js
    try {
      const { getAnalytics, isSupported } = require('firebase/analytics');
      // Analytics requires browser environment, skip in Node.js
      logger.info('Analytics skipped (Node.js environment)');
    } catch (error) {
      // Expected in Node.js
    }

    logger.info('Firebase Client SDK initialized successfully');
    return firebaseClientApp;
  } catch (error) {
    logger.error('Firebase Client SDK initialization failed:', error);
    return null;
  }
};

// Firebase Admin SDK (for server-side operations)
let firebaseAdminApp = null;

const initializeFirebaseAdmin = () => {
  try {
    if (firebaseAdminApp) {
      logger.info('Firebase Admin SDK already initialized');
      return firebaseAdminApp;
    }

    if (!FIREBASE_SERVICE_ACCOUNT) {
      logger.warn('Firebase service account not configured. Admin SDK will be disabled.');
      return null;
    }

    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);

    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: FIREBASE_DATABASE_URL,
    }, 'admin'); // Use a different name to avoid conflicts

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseAdminApp;
  } catch (error) {
    logger.error('Firebase Admin SDK initialization failed:', error);
    return null;
  }
};

// Initialize both SDKs
const initializeFirebase = () => {
  initializeFirebaseClient();
  initializeFirebaseAdmin();
};

const getFirebaseApp = () => {
  return firebaseClientApp || initializeFirebaseClient();
};

const getFirebaseAdminApp = () => {
  return firebaseAdminApp || initializeFirebaseAdmin();
};

module.exports = {
  // Client SDK exports
  initializeFirebaseClient,
  getFirebaseApp,
  firebaseClientApp: () => firebaseClientApp,
  firestore: () => firestore,
  storage: () => storage,
  auth: () => auth,
  analytics: () => analytics,
  
  // Admin SDK exports
  initializeFirebaseAdmin,
  getFirebaseAdminApp,
  
  // Combined initialization
  initializeFirebase,
};
