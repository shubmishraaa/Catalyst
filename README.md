# Catalyst

A mobile-first, session-based self-checkout platform designed to reduce billing queues in retail stores while maintaining controlled access and security.  
The system follows a **platform onboarding model**, where registered and participating stores are supported.

---

## 📌 Problem Statement

In retail environments such as malls and mid-scale stores, customers purchasing only a few items often face long waiting times due to uneven checkout queues.  
Traditional billing systems struggle during peak hours, resulting in poor customer experience and inefficient store operations.

---

## 💡 Solution Overview

The platform enables participating stores to offer a **mobile self-checkout option**:

1. Users scan a **store entry QR** to begin a session.
2. Products are scanned using the in-app camera.
3. Payments are completed on the mobile device.
4. A **secure, time-bound exit QR** is generated.
5. Store staff verifies the exit QR before allowing the user to leave.

The solution is designed to **work alongside existing checkout counters**, not replace them.

---

## ✨ Key Features

- Platform-based onboarding for participating stores  
- Session-based shopping via store entry QR  
- In-app barcode scanning for product identification  
- Real-time product and price validation  
- Instant mobile payment flow  
- Secure exit QR generation and verification  
- Store-specific session binding to prevent cross-store misuse  

---

## 🛠️ Tech Stack

### Frontend
- **Flutter** – Mobile application for users

### Authentication
- **Firebase Authentication** – Secure user identity and session handling

### Scanning
- **Google ML Kit (Barcode Scanning)** – On-device barcode detection using in-app camera

### Backend / Cloud
- **Google Cloud Functions** – Backend APIs for session handling, product lookup, payment validation, and QR verification

### Database
- Platform-managed store and product data  
- Each store’s catalog is logically separated using store identifiers  

---

## 🧭 High-Level System Flow

1. Store onboards to the platform and uploads its product catalog  
2. Store places an entry QR at the entrance  
3. User scans entry QR → session starts for that store  
4. User scans product barcodes → backend fetches store-specific data  
5. Payment is completed  
6. Exit QR is generated and verified at the gate  

---

## 🖥️ Admin Portal (Store Side)

A web-based admin portal allows store owners to:

- View transactions and completed checkouts  
- Monitor active user sessions  
- Manage product listings and pricing  
- Review basic store-level usage insights  

---

## 🚀 MVP Screenshots

![Entry QR Scan](<img width="720" height="1600" alt="image" src="https://github.com/user-attachments/assets/6d1c5a1f-a77b-47d0-800c-71cfaff47217" />
)
![Product Scan](<img width="720" height="1600" alt="image" src="https://github.com/user-attachments/assets/df782150-0f49-4167-bf97-e475454410a9" />
)
![Cart & Payment](<img width="720" height="1600" alt="image" src="https://github.com/user-attachments/assets/0d59f0c1-8b3f-4b0e-b99c-05f5864f9174" />
)
![Exit QR](<img width="720" height="1600" alt="image" src="https://github.com/user-attachments/assets/6f2e55f7-a678-4f91-8e5f-210cfce5ca84" />
)
![Admin Portal]()

---

## 🎥 Demo Video

**Demo Video Link:**  


---

## 👥 Team

- **Harshit Bhardwaj** – Team Leader  
- **Shubham Mishra**  
- **Rudra Kumar**  
- **Aditya Srivastava**  

---

## 🔮 Future Enhancements

- Advanced fraud detection and randomised audit mechanisms  
- Improved database optimisation and large-scale catalog management  
- Inventory sync with existing store POS systems  
- Analytics dashboard for store performance and peak-hour insights  
- Multi-store and chain-level management support  
- Multiple payment options
