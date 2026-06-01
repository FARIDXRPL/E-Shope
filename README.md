# 🛍️ E-Shope Backend

Backend REST API untuk aplikasi e-commerce **E-Shope** (seperti Shopee), dibangun menggunakan **NestJS**, **Prisma**, dan **MySQL**.

---

## 🧰 Tech Stack

| Teknologi | Keterangan |
|---|---|
| NestJS | Framework backend Node.js |
| TypeScript | Bahasa pemrograman |
| Prisma 5 | ORM untuk database |
| MySQL | Database |
| JWT | Autentikasi |
| Bcryptjs | Hash password |
| Class Validator | Validasi DTO |

---

## 📁 Struktur Folder

```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/
│   ├── decorators/
│   │   ├── get-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   └── pagination.dto.ts
│   ├── enums/
│   │   ├── role.enum.ts
│   │   └── transaction-status.enum.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── interceptors/
│       └── transform.interceptor.ts
├── helper/
│   └── jwt-strategy.ts
├── auth/
├── users/
├── categories/
├── products/
├── carts/
└── transactions/
```

---

## ⚙️ Instalasi & Setup

### Prasyarat
- Node.js v18+
- MySQL (XAMPP)
- npm

### 1. Clone repository
```bash
git clone https://github.com/username/e-shope-backend.git
cd e-shope-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment
```bash
cp .env.example .env
```
Isi file `.env`:
```env
DATABASE_URL="mysql://root:@localhost:3306/e_shope"
JWT_SECRET=your_secret_key_here
```

### 4. Jalankan Prisma migrate
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Jalankan server
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server berjalan di `http://localhost:3000/api`

---

## 👥 Role

| Role | Keterangan |
|---|---|
| `BUYER` | Pembeli — bisa browse, cart, dan transaksi |
| `SELLER` | Penjual — bisa CRUD produk milik sendiri |
| `ADMIN` | Admin — akses penuh ke semua data |

---

## 📌 API Endpoints

### 🔐 Auth
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Daftar akun baru |
| POST | `/api/auth/login` | Public | Login |

### 👤 Users
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/users` | Admin | Buat user baru |
| GET | `/api/users` | Admin | Semua user |
| GET | `/api/users/me` | Semua | Profil sendiri |
| GET | `/api/users/:id` | Admin | Detail user |
| PATCH | `/api/users/:id` | Admin / Diri sendiri | Update user |
| DELETE | `/api/users/:id` | Admin | Hapus user |

### 🗂️ Categories
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/categories` | Admin | Buat kategori |
| GET | `/api/categories` | Public | Semua kategori |
| GET | `/api/categories/:id` | Public | Detail kategori |
| PATCH | `/api/categories/:id` | Admin | Update kategori |
| DELETE | `/api/categories/:id` | Admin | Hapus kategori |

### 📦 Products
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/products` | Seller & Admin | Buat produk |
| GET | `/api/products` | Public | Semua produk |
| GET | `/api/products/me` | Seller & Admin | Produk milik sendiri |
| GET | `/api/products/:id` | Public | Detail produk |
| PATCH | `/api/products/:id` | Seller pemilik & Admin | Update produk |
| DELETE | `/api/products/:id` | Seller pemilik & Admin | Hapus produk |

**Query params products:**
```
?search=nama_produk
?categoryId=1
?minPrice=10000&maxPrice=500000
?sortBy=price&sortOrder=asc
?page=1&limit=10
```

### 🛒 Carts
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/carts` | Buyer | Lihat keranjang |
| POST | `/api/carts` | Buyer | Tambah item |
| PATCH | `/api/carts/:itemId` | Buyer | Update quantity |
| DELETE | `/api/carts/:itemId` | Buyer | Hapus satu item |
| DELETE | `/api/carts` | Buyer | Kosongkan keranjang |

### 💳 Transactions
| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/transactions/checkout` | Buyer | Checkout |
| GET | `/api/transactions` | Admin | Semua transaksi |
| GET | `/api/transactions/me` | Buyer | Transaksi sendiri |
| GET | `/api/transactions/:id` | Buyer & Admin | Detail transaksi |
| PATCH | `/api/transactions/:id/status` | Admin | Update status |
| PATCH | `/api/transactions/:id/cancel` | Buyer | Batalkan transaksi |

**Status transaksi:**
```
PENDING → PAID → SHIPPED → DELIVERED
                         ↘ CANCELLED
```

---

## 🔑 Contoh Request

### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "BUYER"
}
```

### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Tambah ke Keranjang
```json
POST /api/carts
Authorization: Bearer <token>
{
  "productId": 1,
  "quantity": 2
}
```

### Checkout
```json
POST /api/transactions/checkout
Authorization: Bearer <token>
{}
// Kosong = checkout semua item di keranjang

// Atau pilih item tertentu:
{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ]
}
```

---

## 📊 Database Schema

```
users          → id, name, email, password, phone, role, avatar, isActive
categories     → id, name, slug
products       → id, sellerId, categoryId, name, description, price, stock, images, isActive
carts          → id, userId
cart_items     → id, cartId, productId, quantity
transactions   → id, userId, totalPrice, status
transaction_items → id, transactionId, productId, quantity, price
```

---

## 📝 Format Response

Semua response menggunakan format konsisten:
```json
{
  "statusCode": 200,
  "message": "Berhasil",
  "data": { ... }
}
```

Error response:
```json
{
  "statusCode": 400,
  "message": "Pesan error",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

---

## 👨‍💻 Developer

Dibuat dengan ❤️ oleh tim **E-Shope**
