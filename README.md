# Catalyst | Scan & Go Retail Self-Checkout

Catalyst is a modern supermarket self-checkout system. Shoppers scan products on their mobile devices, manage a real-time cart, and pay via UPI, avoiding long queues.

## 🚀 Key Features
- **Mobile-First Shopper App**: High-fidelity scanning experience with allergen alerts.
- **Admin Dashboard**: Real-time store monitoring and security flagging.
- **Smart Scan Insights**: AI-powered allergen warnings based on user preferences.
- **Security Logic**: Automated flagging for suspicious behavior (high scan velocity, low cart totals).

## 🛠 Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, Lucide Icons, Shadcn/UI
- **Backend**: Firebase Auth, Firestore (Real-time)
- **Design**: Modern Teal/Navy theme with Inter typography

## 📦 Demo Credentials
- **Role**: Shopper
- **Email**: `user@example.com`
- **Password**: `catalyst123`

## 🛒 Demo Barcodes
Use these values in the manual scanner for testing:
- `123`: Organic Whole Milk (Allergen: Dairy, Offer: B1G1)
- `456`: Artisan Sourdough (Allergen: Gluten)
- `789`: Mixed Roasted Nuts (Allergen: Nuts, Offer: 10% Off)
- `012`: Choco Cookies (Multi-allergen)

## 🏗 Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up Firebase environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
   ```
4. Run development server: `npm run dev`

## 🧪 Security Logic
- **High Scan Velocity**: If >5 items are scanned in 15 seconds, a flag is triggered.
- **Suspicious Totals**: If >20 items exist but total <₹200, a high-severity flag is raised.
- **Random Audit**: 30% chance of random verification upon checkout.