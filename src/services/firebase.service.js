// Firebase service utilities for backend operations
const {
  getFirebaseApp,
  firestore,
  storage,
  auth,
  getFirebaseAdminApp,
} = require('../config/firebase');
const admin = require('firebase-admin');
const logger = require('../utils/logger');

// ==================== Firestore Operations (Client SDK) ====================

/**
 * Note: Firestore client SDK operations may have limitations in Node.js
 * For production server-side operations, consider using Firebase Admin SDK
 */

// ==================== Admin SDK Operations ====================

/**
 * Get Firestore instance from Admin SDK
 */
const getAdminFirestore = () => {
  try {
    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.firestore();
  } catch (error) {
    logger.error('Error getting Admin Firestore:', error);
    throw error;
  }
};

/**
 * Get Storage instance from Admin SDK
 */
const getAdminStorage = () => {
  try {
    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.storage();
  } catch (error) {
    logger.error('Error getting Admin Storage:', error);
    throw error;
  }
};

/**
 * Get Auth instance from Admin SDK
 */
const getAdminAuth = () => {
  try {
    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.auth();
  } catch (error) {
    logger.error('Error getting Admin Auth:', error);
    throw error;
  }
};

// ==================== Firestore Operations ====================

/**
 * Get a document from Firestore (Admin SDK)
 */
const getDocument = async (collectionName, documentId) => {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(collectionName).doc(documentId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    logger.error(`Error getting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all documents from a collection (Admin SDK)
 */
const getDocuments = async (collectionName, queryConstraints = []) => {
  try {
    const db = getAdminFirestore();
    let query = db.collection(collectionName);
    
    // Apply query constraints
    queryConstraints.forEach(constraint => {
      if (constraint.type === 'where') {
        query = query.where(constraint.field, constraint.operator, constraint.value);
      } else if (constraint.type === 'orderBy') {
        query = query.orderBy(constraint.field, constraint.direction || 'asc');
      } else if (constraint.type === 'limit') {
        query = query.limit(constraint.value);
      }
    });
    
    const querySnapshot = await query.get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Create a document in Firestore (Admin SDK)
 */
const createDocument = async (collectionName, data) => {
  try {
    const db = getAdminFirestore();
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    logger.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document in Firestore (Admin SDK)
 */
const updateDocument = async (collectionName, documentId, data) => {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(collectionName).doc(documentId);
    await docRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document from Firestore (Admin SDK)
 */
const deleteDocument = async (collectionName, documentId) => {
  try {
    const db = getAdminFirestore();
    await db.collection(collectionName).doc(documentId).delete();
  } catch (error) {
    logger.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

// ==================== Storage Operations ====================

/**
 * Upload a file to Firebase Storage (Admin SDK)
 */
const uploadFile = async (bucketName, filePath, fileBuffer, metadata = {}) => {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: metadata.customMetadata || {},
      },
    });
    
    // Make file publicly accessible (optional)
    if (metadata.public) {
      await file.makePublic();
    }
    
    // Get download URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Far future date
    });
    
    return url;
  } catch (error) {
    logger.error(`Error uploading file to ${filePath}:`, error);
    throw error;
  }
};

/**
 * Get download URL for a file (Admin SDK)
 */
const getFileURL = async (bucketName, filePath) => {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });
    
    return url;
  } catch (error) {
    logger.error(`Error getting file URL for ${filePath}:`, error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage (Admin SDK)
 */
const deleteFile = async (bucketName, filePath) => {
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket(bucketName);
    await bucket.file(filePath).delete();
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
};

// ==================== Authentication Operations ====================

/**
 * Create a custom token for a user (Admin SDK)
 */
const createCustomToken = async (uid, additionalClaims = {}) => {
  try {
    const auth = getAdminAuth();
    return await auth.createCustomToken(uid, additionalClaims);
  } catch (error) {
    logger.error(`Error creating custom token for ${uid}:`, error);
    throw error;
  }
};

/**
 * Verify ID token (Admin SDK)
 */
const verifyIdToken = async (idToken) => {
  try {
    const auth = getAdminAuth();
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    logger.error('Error verifying ID token:', error);
    throw error;
  }
};

/**
 * Get user by UID (Admin SDK)
 */
const getUser = async (uid) => {
  try {
    const auth = getAdminAuth();
    return await auth.getUser(uid);
  } catch (error) {
    logger.error(`Error getting user ${uid}:`, error);
    throw error;
  }
};

module.exports = {
  // Firestore operations
  getDocument,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  
  // Storage operations
  uploadFile,
  getFileURL,
  deleteFile,
  
  // Auth operations
  createCustomToken,
  verifyIdToken,
  getUser,
  
  // Direct access to instances
  getAdminFirestore,
  getAdminStorage,
  getAdminAuth,
};

