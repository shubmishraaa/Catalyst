**🚧 This repository currently contains the project structure and documentation. Source code is under active development.**

# Catalyst

A mobile-first, session-based self-checkout platform designed to reduce billing queues in retail stores while maintaining controlled access and lightweight security.  
The system follows a **platform onboarding model**, where registered and participating stores are supported.

---

## 📌 Problem Statement

In retail environments such as supermarkets and mid-scale stores, customers purchasing only a few items often face long waiting times due to uneven checkout queues.  
Traditional billing systems struggle during peak hours, resulting in poor customer experience and inefficient store operations.

---

## 💡 Solution Overview

The platform enables participating stores to offer a **mobile self-checkout option**:

1. Users scan a **store entry QR** to begin a session.  
2. Products are scanned using the in-app camera.  
3. Price and offer details appear during scanning.  
4. Payments are completed on the mobile device via UPI.  
5. A **secure, time-bound exit QR** is generated.  
6. Store staff verifies the exit QR before allowing the user to leave.

The solution is designed to **work alongside existing checkout counters**, not replace them.

---

## ✨ Key Features

- QR-based store session binding  
- Smart scan overlay with price and offers  
- Dietary and allergen insights for food items  
- Behaviour-based session flagging for unusual patterns  
- Random exit audits to discourage misuse  
- Store-specific session validation to prevent cross-store errors  

---

## 🛠️ Tech Stack

### Frontend
- **Flutter** — Mobile application for users  
- **React** — Store admin dashboard  

### Authentication
- **Firebase Authentication** — Secure user sessions  

### Scanning
- **Google ML Kit** — In-app barcode detection  

### Backend / Cloud
- **Google Cloud Functions** — Session engine, product validation, payment verification, QR handling  

### Database
- **MySQL** — Products, sessions, carts, transactions, audit logs  

### Payments
- **UPI Deep Linking** — Works with any UPI app  

---

## 🧭 High-Level System Flow

1. Store onboards to the platform and uploads product catalog  
2. Store places entry QR codes for session start  
3. User scans QR → session starts for that store  
4. User scans product barcodes → backend fetches store-specific data  
5. Payment is completed  
6. Exit QR is generated and verified at the gate with possible random check  

---

## 🖥️ Admin Portal (Store Side)

A web-based admin portal allows store owners to:

- View transactions and completed checkouts  
- Monitor active user sessions  
- Track behaviour flags and exit audits  
- Manage product listings, pricing, and offers  
- Review store-level usage insights  

---

## 💼 Business Model

Catalyst operates as a **Retail SaaS platform**:

- Store subscription for using the Scan & Go system  
- In-app promotion of store offers and products  
- Premium analytics for store insights  
- Enterprise plans for retail chains with multiple outlets  

---

## 🎯 Goal

To make checkout **faster for customers** and **smarter for retailers** using a lightweight, software-only approach.

---

## 🚀 MVP Screenshots

[Drive](https://drive.google.com/drive/folders/1Klr6pfNmefMWn6rPPY7HJD-Om4z2-QG-?dmr=1&ec=wgc-drive-hero-goto)

---

## 🎥 Demo Video

**Demo Video Link:**  
[View](https://www.youtube.com/shorts/14c8SqYzUbU)

---

## 👥 Team

- **Shubham Mishra** – Team Lead 
- **Harshit Bhardwaj**  
- **Rudra Kumar**  
- **Aditya Srivastava**  

---
