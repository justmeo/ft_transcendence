# ft_transcendence
# ft_transcendence 🎮  

> A full-stack web application project from 42 School — building a **real-time multiplayer Pong platform** with modern web technologies, security best practices, and modular enhancements.  

---

## 📖 Overview  
**ft_transcendence** is a capstone project that challenges students to develop a **single-page web application** hosting the iconic **Pong game** with real-time multiplayer support.  

The project focuses on:  
- Building a **user-friendly interface** for gameplay and tournaments.  
- Ensuring **security, performance, and accessibility**.  
- Integrating **modern web practices** (Docker, TypeScript, frameworks, databases, etc.).  
- Extending functionality via **modules** (AI, blockchain, DevOps, remote play, chat, etc.).  

---

## 🎯 Objectives  
- Create a **single-page application** (SPA) compatible with the latest Firefox.  
- Provide **real-time Pong matches** (local & remote).  
- Implement a **tournament system** with matchmaking.  
- Ensure **security**: HTTPS, input validation, password hashing, SQLi/XSS prevention.  
- Deploy with **Docker**: one command to spin up the full environment.  

---

## ⚙️ Tech Stack (Minimal Requirements)  
- **Frontend:** TypeScript (custom or with optional Tailwind module).  
- **Backend (optional):** Pure PHP (no frameworks) or Fastify/Node.js (via module).  
- **Database (optional):** SQLite (via module).  
- **Deployment:** Docker (rootless-ready).  

---

## 🕹️ Core Features  
✅ Local Pong game (2 players, one keyboard).  
✅ Tournament mode with alias registration & matchmaking.  
✅ Consistent paddle speed & rules.  
✅ SPA navigation with Back/Forward support.  
✅ Error-free browsing experience.  

---

## 🔐 Security  
- Passwords must be **hashed**.  
- Protection against **SQL injection & XSS**.  
- All communications over **HTTPS / WSS**.  
- Input validation on client and/or server.  
- Sensitive data (API keys, credentials) stored in `.env` and **git-ignored**.  

---

## 🧩 Modules (Choose ≥7 Major for 100%)  

### Web  
- Backend Framework (Fastify / Node.js).  
- Frontend Toolkit (Tailwind CSS).  
- Database (SQLite).  
- Blockchain scores (Avalanche + Solidity).  

### User Management  
- User profiles & authentication.  
- Remote login (Google Sign-in).  

### Gameplay & UX  
- Remote players.  
- Multiplayer (>2 players).  
- Extra games with history & matchmaking.  
- Live chat.  

### AI & Algorithms  
- AI-controlled Pong opponent.  
- Stats dashboards.  

### Cybersecurity  
- WAF + HashiCorp Vault.  
- GDPR compliance (data anonymization, deletion).  
- 2FA + JWT authentication.  

### DevOps  
- ELK stack for log management.  
- Prometheus + Grafana monitoring.  
- Microservices backend.  

### Graphics  
- 3D Pong with Babylon.js.  

### Accessibility  
- Multi-device, multi-language, visually impaired support.  
- Server-Side Rendering (SSR).  

### Server-Side Pong  
- Server-side Pong + API.  
- CLI Pong vs Web users.  

---

## 🌟 Bonus  
- Minor module: +5 pts  
- Major module: +10 pts  
- Bonus counts only if **mandatory part is perfect**.  

---

## 🚀 Getting Started  

### Prerequisites  
- [Docker](https://www.docker.com/)  
- [Node.js](https://nodejs.org/) (if using Fastify backend)  
- [SQLite](https://www.sqlite.org/) (if database module chosen)  

### Installation  
```bash
# Clone repository
git clone https://github.com/your-username/ft_transcendence.git
cd ft_transcendence

# Launch with Docker
docker-compose up --build

