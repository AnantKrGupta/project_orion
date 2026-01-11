# 💬 Thapar Chat

<div align="center">

![Thapar Chat Banner](https://img.shields.io/badge/Thapar-Chat-purple?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0ibTMgMjEgMS45LTUuN2ExOC41IDE4LjUgMCAwIDEgMS44LTMuM0g4IiAvPjxwYXRoIGQ9Ik04IDguOVY3YTQgNCAwIDAgMSA0LTQiIC8+PHBhdGggZD0ibTUgNCA1IDUiIC8+PC9zdmc+)

**Anonymous chat platform exclusively for Thapar University students**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-client--eight--self.vercel.app-00C7B7?style=for-the-badge)](https://client-eight-self.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 End-to-End Encryption
All chat messages are encrypted using **Web Crypto API**. Only you and your chat partner can read messages.

### 🎭 Anonymous Matching
Get matched with random Thaparites. Chat anonymously and reveal identities when you're ready.

### 👥 Friend System
Found someone cool? Send a friend request to stay connected forever.

</td>
<td width="50%">

### 📱 Modern UI
Beautiful dark theme with glassmorphism, smooth animations, and mobile-first design.

### 🛡️ Thapar Only
Only verified `@thapar.edu` emails can access. Your community, your space.

### 📝 Social Feed
Share confessions, thoughts, and connect with the community through posts and comments.

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=blue)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

### Authentication & Hosting
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Heroku](https://img.shields.io/badge/Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)

---

## 📁 Project Structure

```
thapar-chat/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React Context providers
│   │   ├── pages/          # Route pages
│   │   └── utils/          # Utility functions
│   └── package.json
│
├── server/                 # Express Backend
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   └── index.js            # Entry point
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Firebase project (for authentication)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/thapar-chat.git
cd thapar-chat
```

2. **Set up the server**
```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI
```

3. **Set up the client**
```bash
cd ../client
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Firebase config and server URL
```

4. **Run locally**
```bash
# Terminal 1 - Server
cd server
npm start

# Terminal 2 - Client
cd client
npm run dev
```

---

## 🔧 Environment Variables

### Server (`server/.env`)
```env
MONGODB_URI=your_mongodb_connection_string
PORT=3001
```

### Client (`client/.env`)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SERVER_URL=http://localhost:3001
```

---

## 📱 Screenshots

<div align="center">
<i>Coming soon</i>
</div>

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Anant Kumar Gupta**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/anantkrgupta)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/anantkrgupta)

---

<div align="center">

**⭐ Star this repo if you like it!**

Made with ❤️ for Thaparites

</div>
