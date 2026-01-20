# PRK Smiles API Documentation

Complete API documentation for the B2B Food Ordering System.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### 1. Send OTP
**POST** `/auth/send-otp`

Send OTP to mobile number for login.

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": null
}
```

---

### 2. Verify OTP
**POST** `/auth/verify-otp`

Verify OTP and get JWT token.

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "mobileNumber": "9876543210",
      "role": "hotel",
      "isProfileComplete": false
    }
  }
}
```

---

### 3. Setup Profile
**POST** `/auth/setup-profile` (Requires Auth)

Setup user profile after first login.

**Request Body:**
```json
{
  "hotelName": "Grand Hotel",
  "address": "123 Main Street, City",
  "gstNumber": "29ABCDE1234F1Z5",
  "fcmToken": "fcm-token-for-push-notifications"
}
```

---

### 4. Update FCM Token
**POST** `/auth/fcm-token` (Requires Auth)

Update FCM token for push notifications.

**Request Body:**
```json
{
  "fcmToken": "new-fcm-token"
}
```

---

## User/Hotel Endpoints

### Products

#### 1. Get Categories
**GET** `/user/categories` (Requires Auth)

Get all active categories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "category-id",
      "name": "Vegetables",
      "description": "Fresh vegetables",
      "image": "path/to/image.jpg",
      "isActive": true
    }
  ]
}
```

---

#### 2. Get Products
**GET** `/user/products` (Requires Auth)

Get all active products.

**Query Parameters:**
- `category` (optional): Filter by category ID
- `search` (optional): Search products by name/description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product-id",
      "name": "Tomato",
      "description": "Fresh tomatoes",
      "category": {
        "_id": "category-id",
        "name": "Vegetables"
      },
      "images": ["path/to/image.jpg"],
      "price": 50,
      "unit": "kg",
      "stock": 100
    }
  ]
}
```

---

#### 3. Get Product by ID
**GET** `/user/products/:id` (Requires Auth)

Get single product details.

---

### Orders

#### 1. Create Order
**POST** `/user/orders` (Requires Auth)

Place a new order.

**Request Body:**
```json
{
  "items": [
    {
      "product": "product-id",
      "quantity": 5
    }
  ],
  "specialInstructions": "Please deliver in the morning",
  "deliveryTime": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order-id",
    "orderNumber": "ORD000001",
    "items": [...],
    "subtotal": 250,
    "totalAmount": 250,
    "status": "pending",
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

---

#### 2. Get Orders
**GET** `/user/orders` (Requires Auth)

Get user's orders.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending, confirmed, dispatched, delivered)

---

#### 3. Get Order by ID
**GET** `/user/orders/:id` (Requires Auth)

Get single order details.

---

#### 4. Reorder
**POST** `/user/orders/reorder` (Requires Auth)

Reorder a previous order.

**Request Body:**
```json
{
  "orderId": "previous-order-id",
  "items": [...], // Optional: override items
  "specialInstructions": "...",
  "deliveryTime": "..."
}
```

---

#### 5. Get Invoice
**GET** `/user/orders/:orderId/invoice` (Requires Auth)

Get invoice for an order.

---

### Profile

#### 1. Get Profile
**GET** `/user/profile` (Requires Auth)

Get user profile with order statistics.

---

#### 2. Update Profile
**PUT** `/user/profile` (Requires Auth)

Update user profile.

**Request Body:**
```json
{
  "hotelName": "Updated Hotel Name",
  "address": "New Address",
  "gstNumber": "29ABCDE1234F1Z5"
}
```

---

#### 3. Get Notifications
**GET** `/user/notifications` (Requires Auth)

Get user notifications.

**Query Parameters:**
- `page`, `limit`: Pagination
- `isRead` (optional): Filter by read status

---

#### 4. Mark Notification as Read
**PUT** `/user/notifications/:id/read` (Requires Auth)

Mark a notification as read.

---

### Brands

#### 1. Get All Brands (Public)
**GET** `/brands`

Get all active brands.

**Response:**
```json
{
  "success": true,
  "message": "Brands retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Brand Name",
      "imageUrl": "http://example.com/image.jpg",
      "description": "Brand description"
    }
  ]
}
```

---

#### 2. Get Brand by ID (Public)
**GET** `/brands/:id`

Get specific brand details.

**Response:**
```json
{
  "success": true,
  "message": "Brand retrieved successfully",
  "data": {
    "id": 1,
    "name": "Brand Name",
    "imageUrl": "http://example.com/image.jpg",
    "description": "Brand description"
  }
}
```

---

## Admin Endpoints

### Dashboard

#### 1. Get Dashboard Stats
**GET** `/admin/dashboard` (Requires Admin)

Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "pendingOrders": 10,
    "completedOrders": 120,
    "todaySales": 50000,
    "topHotels": [...]
  }
}
```

---

### Products (Admin)

#### 1. Create Product
**POST** `/admin/products` (Requires Admin)

Create a new product.



**Request:** Multipart form data
- `name`: Product name
- `description`: Product description
- `category`: Category ID
- `price`: Product price
- `unit`: Unit (kg, piece, etc.)
- `stock`: Stock quantity
- `minStockLevel`: Minimum stock level
- `images`: Product images (files)

---

#### 2. Get Products
**GET** `/admin/products` (Requires Admin)

Get all products with pagination and filters.

**Query Parameters:**
- `page`, `limit`: Pagination
- `category`: Filter by category
- `status`: Filter by status
- `isActive`: Filter by active status
- `search`: Search products

---

#### 3. Get Product by ID
**GET** `/admin/products/:id` (Requires Admin)

---

#### 4. Update Product
**PUT** `/admin/products/:id` (Requires Admin)

Update product details (multipart form data).

---

#### 5. Delete Product
**DELETE** `/admin/products/:id` (Requires Admin)

---

#### 6. Update Stock
**PATCH** `/admin/products/:id/stock` (Requires Admin)

Update product stock.

**Request Body:**
```json
{
  "stock": 150
}
```

---

### Brands (Admin)

#### 1. Create Brand
**POST** `/admin/brands` (Requires Admin)

Create a new brand.

**Request Body:**
```json
{
  "name": "Brand Name",
  "imageUrl": "http://example.com/image.jpg",
  "description": "Brand description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Brand created successfully",
  "data": {
    "id": 1,
    "name": "Brand Name",
    "imageUrl": "http://example.com/image.jpg",
    "description": "Brand description",
    "isActive": true,
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

---

#### 2. Get All Brands
**GET** `/admin/brands` (Requires Admin)

Get all brands with pagination and filters.

**Query Parameters:**
- `page`, `limit`: Pagination
- `isActive`: Filter by active status
- `search`: Search by name or description

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": 1,
        "name": "Brand Name",
        "imageUrl": "http://example.com/image.jpg",
        "description": "Brand description",
        "isActive": true,
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 20
    }
  }
}
```

---

#### 3. Get Brand by ID
**GET** `/admin/brands/:id` (Requires Admin)

Get specific brand details.

**Response:**
```json
{
  "success": true,
  "message": "Brand retrieved successfully",
  "data": {
    "id": 1,
    "name": "Brand Name",
    "imageUrl": "http://example.com/image.jpg",
    "description": "Brand description",
    "isActive": true,
    "createdAt": "2024-01-15T08:00:00Z",
    "updatedAt": "2024-01-15T08:00:00Z"
  }
}
```

---

#### 4. Update Brand
**PUT** `/admin/brands/:id` (Requires Admin)

Update brand details.

**Request Body:**
```json
{
  "name": "Updated Brand Name",
  "imageUrl": "http://example.com/new-image.jpg",
  "description": "Updated description",
  "isActive": true
}
```

---

#### 5. Delete Brand
**DELETE** `/admin/brands/:id` (Requires Admin)

Delete a brand.

**Response:**
```json
{
  "success": true,
  "message": "Brand deleted successfully",
  "data": null
}
```

---

### Categories (Admin)

#### 1. Create Category
**POST** `/admin/categories` (Requires Admin)

Create a new category (multipart form data).

---

#### 2. Get Categories
**GET** `/admin/categories` (Requires Admin)

---

#### 3. Get Category by ID
**GET** `/admin/categories/:id` (Requires Admin)

---

#### 4. Update Category
**PUT** `/admin/categories/:id` (Requires Admin)

---

#### 5. Delete Category
**DELETE** `/admin/categories/:id` (Requires Admin)

---

### Orders (Admin)

#### 1. Get Orders
**GET** `/admin/orders` (Requires Admin)

Get all orders with filters.

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status
- `hotel`: Filter by hotel ID
- `startDate`, `endDate`: Date range filter

---

#### 2. Get Order by ID
**GET** `/admin/orders/:id` (Requires Admin)

---

#### 3. Update Order Status
**PATCH** `/admin/orders/:id/status` (Requires Admin)

Update order status.

**Request Body:**
```json
{
  "status": "confirmed",
  "assignedTo": "Delivery Team A"
}
```

**Status Values:**
- `pending`
- `confirmed`
- `dispatched`
- `delivered`
- `cancelled`

---

#### 4. Generate Invoice
**POST** `/admin/orders/:id/invoice` (Requires Admin)

Generate invoice for an order.

---

### Hotels (Admin)

#### 1. Create Hotel
**POST** `/admin/hotels` (Requires Admin)

Create a new hotel account.

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "hotelName": "Grand Hotel",
  "address": "123 Main Street",
  "gstNumber": "29ABCDE1234F1Z5",
  "creditLimit": 50000
}
```

---

#### 2. Get Hotels
**GET** `/admin/hotels` (Requires Admin)

Get all hotels with pagination.

**Query Parameters:**
- `page`, `limit`: Pagination
- `isBlocked`: Filter by blocked status
- `search`: Search by name or mobile

---

#### 3. Get Hotel by ID
**GET** `/admin/hotels/:id` (Requires Admin)

---

#### 4. Update Hotel
**PUT** `/admin/hotels/:id` (Requires Admin)

---

#### 5. Block/Unblock Hotel
**PATCH** `/admin/hotels/:id/block` (Requires Admin)

**Request Body:**
```json
{
  "isBlocked": true
}
```

---

#### 6. Delete Hotel
**DELETE** `/admin/hotels/:id` (Requires Admin)

---

### Reports (Admin)

#### 1. Daily Report
**GET** `/admin/reports/daily` (Requires Admin)

**Query Parameters:**
- `date` (optional): Date for report (default: today)

---

#### 2. Weekly Report
**GET** `/admin/reports/weekly` (Requires Admin)

---

#### 3. Monthly Report
**GET** `/admin/reports/monthly` (Requires Admin)

---

#### 4. GST Report
**GET** `/admin/reports/gst` (Requires Admin)

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [...] // Optional: validation errors
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

---

## Error Responses

### Common Brand API Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Brand name is required"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Brand not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "Brand name already exists"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Brand API Examples

### cURL Examples

#### Get All Brands (Public)
```bash
curl -X GET "http://localhost:3001/api/brands"
```

#### Get Specific Brand (Public)
```bash
curl -X GET "http://localhost:3001/api/brands/1"
```

#### Create Brand (Admin)
```bash
curl -X POST "http://localhost:3001/api/admin/brands" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Brand",
    "imageUrl": "http://example.com/test-brand.jpg",
    "description": "A test brand for demonstration"
  }'
```

#### Update Brand (Admin)
```bash
curl -X PUT "http://localhost:3001/api/admin/brands/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Brand Name",
    "imageUrl": "http://example.com/updated-brand.jpg",
    "description": "Updated brand description",
    "isActive": true
  }'
```

#### Delete Brand (Admin)
```bash
curl -X DELETE "http://localhost:3001/api/admin/brands/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Swagger Documentation

API documentation is available at:
```
http://localhost:3000/api-docs
```

---

## Notes

1. **OTP Service**: Currently logs OTP to console. In production, integrate with SMS service (Twilio, AWS SNS, etc.).

2. **File Uploads**: Files are stored in `./uploads` directory. Configure proper storage (S3, etc.) for production.

3. **Firebase**: Configure Firebase service account for push notifications. If not configured, notifications will be stored but not sent.

4. **Super Admin**: Create a super admin user manually in the database with `role: 'super_admin'`.

5. **Invoice Generation**: Invoices are automatically generated when order status changes to "delivered".

6. **Stock Management**: Stock is automatically decremented when orders are placed. Low stock alerts run every 6 hours.

7. **Daily Reports**: Daily reports are scheduled to run at 9 AM daily.

---

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Start MongoDB:
```bash
# Make sure MongoDB is running
```

4. Start the server:
```bash
npm run dev  # Development
npm start    # Production
```

5. Access API documentation:
```
http://localhost:3000/api-docs
```

---

## Testing

Run tests:
```bash
npm test
```

---

## Support

For issues or questions, please refer to the project documentation or contact the development team.

