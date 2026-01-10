# Firebase Configuration - Backend

## Overview

Firebase has been initialized in the backend with both **Client SDK** and **Admin SDK** support.

## Configuration Files

### 1. `src/config/firebase.js`
- Initializes both Firebase Client SDK and Admin SDK
- Client SDK: For client-side operations (Firestore, Storage, Auth)
- Admin SDK: For server-side operations (notifications, admin tasks)

### 2. `src/services/firebase.service.js`
- Utility functions for Firebase operations
- Uses Admin SDK for server-side operations
- Provides CRUD operations for Firestore
- File upload/download for Storage
- Authentication utilities

## Firebase Client SDK

The Client SDK is initialized with the following configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDJ0Jc5Vl9gxkhQM-vKsyl6Acep-EDirtk",
  authDomain: "prk-smiles.firebaseapp.com",
  projectId: "prk-smiles",
  storageBucket: "prk-smiles.firebasestorage.app",
  messagingSenderId: "96495423870",
  appId: "1:96495423870:web:c5ae43caf8a9b4681e232f",
  measurementId: "G-EL5LME26LR"
};
```

**Note**: Some Client SDK features may have limitations in Node.js environment. For production server-side operations, use the Admin SDK.

## Usage

### Using Firebase Service (Recommended for Backend)

```javascript
const {
  getDocument,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadFile,
  getFileURL,
  deleteFile,
} = require('../services/firebase.service');

// Firestore operations
const product = await getDocument('products', 'productId');
const products = await getDocuments('products', [
  { type: 'where', field: 'isActive', operator: '==', value: true },
  { type: 'orderBy', field: 'createdAt', direction: 'desc' },
  { type: 'limit', value: 10 },
]);

// Create document
const productId = await createDocument('products', {
  name: 'Product Name',
  price: 100,
  isActive: true,
});

// Update document
await updateDocument('products', productId, {
  price: 120,
});

// Delete document
await deleteDocument('products', productId);

// Storage operations
const imageUrl = await uploadFile(
  'prk-smiles.firebasestorage.app', // bucket name
  'products/image.jpg', // file path
  fileBuffer, // file buffer
  {
    contentType: 'image/jpeg',
    public: true, // make publicly accessible
  }
);

// Get file URL
const url = await getFileURL('prk-smiles.firebasestorage.app', 'products/image.jpg');

// Delete file
await deleteFile('prk-smiles.firebasestorage.app', 'products/image.jpg');
```

### Direct Access to Firebase Instances

```javascript
const {
  getFirebaseApp,
  firestore,
  storage,
  auth,
  getFirebaseAdminApp,
} = require('../config/firebase');

// Client SDK instances
const clientApp = getFirebaseApp();
const clientFirestore = firestore();
const clientStorage = storage();
const clientAuth = auth();

// Admin SDK instances
const adminApp = getFirebaseAdminApp();
const adminFirestore = getAdminFirestore();
const adminStorage = getAdminStorage();
const adminAuth = getAdminAuth();
```

## Firebase Admin SDK

The Admin SDK is used for:
- Server-side Firestore operations
- Storage file management
- User authentication management
- Push notifications
- Custom token generation

### Environment Variables Required

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"prk-smiles",...}
FIREBASE_DATABASE_URL=https://prk-smiles-default-rtdb.firebaseio.com
```

## Example: Products with Firebase

```javascript
const {
  getDocuments,
  createDocument,
  updateDocument,
  uploadFile,
} = require('../services/firebase.service');

// Get all active products
const products = await getDocuments('products', [
  { type: 'where', field: 'isActive', operator: '==', value: true },
]);

// Create product with image
const imageUrl = await uploadFile(
  'prk-smiles.firebasestorage.app',
  `products/${Date.now()}_${imageFile.originalname}`,
  imageFile.buffer,
  { contentType: imageFile.mimetype, public: true }
);

const productId = await createDocument('products', {
  name: 'Product Name',
  description: 'Description',
  price: 100,
  imageUrl,
  isActive: true,
});
```

## Authentication

### Create Custom Token

```javascript
const { createCustomToken } = require('../services/firebase.service');

const customToken = await createCustomToken('user-uid', {
  role: 'admin',
  email: 'admin@example.com',
});
```

### Verify ID Token

```javascript
const { verifyIdToken } = require('../services/firebase.service');

const decodedToken = await verifyIdToken(idToken);
console.log(decodedToken.uid);
```

## Initialization

Firebase is automatically initialized when the server starts (see `src/server.js`):

```javascript
const { initializeFirebase } = require('./config/firebase');
initializeFirebase(); // Initializes both Client and Admin SDKs
```

## Best Practices

1. **Use Admin SDK for Server Operations**: The Admin SDK is designed for server-side operations and has full access to Firebase services.

2. **Client SDK Limitations**: The Client SDK may have limitations in Node.js. Use it for specific client-side operations if needed.

3. **Error Handling**: Always wrap Firebase operations in try-catch blocks.

4. **File Naming**: Use unique file names for uploads (e.g., `Date.now()_filename`).

5. **Security Rules**: Configure Firestore Security Rules and Storage Rules in Firebase Console.

6. **Service Account**: Keep your Firebase service account credentials secure and never commit them to version control.

## Firebase Console

Access your Firebase project at: https://console.firebase.google.com/project/prk-smiles

## Support

For more information:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Client SDK Documentation](https://firebase.google.com/docs/web/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Storage Documentation](https://firebase.google.com/docs/storage)

