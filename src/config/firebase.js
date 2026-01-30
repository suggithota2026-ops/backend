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
  // Skip client-side Firebase SDK initialization in backend environment
  // This prevents auth errors when client-side config is not provided
  logger.info('Skipping Firebase Client SDK initialization in backend environment');
  return null;
};

// Firebase Admin SDK (for server-side operations)
let firebaseAdminApp = null;

const initializeFirebaseAdmin = () => {
  try {
    if (firebaseAdminApp) {
      logger.info('Firebase Admin SDK already initialized');
      return firebaseAdminApp;
    }

    // Try to initialize using service account file path first
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccountPath = require('path').join(__dirname, '..', '..', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      if (require('fs').existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        firebaseAdminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: FIREBASE_DATABASE_URL,
        }, 'admin');
        
        logger.info('Firebase Admin SDK initialized with service account file');
        return firebaseAdminApp;
      }
    }
    
    // Fallback to service account JSON in environment variable
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

// Initialize Admin SDK only (client SDK is not needed in backend)
const initializeFirebase = () => {
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
