# 🚆 TC-Tracker

![React Native](https://img.shields.io/badge/React%20Native-Mobile%20App-blue)
![Expo](https://img.shields.io/badge/Expo-Framework-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

TC-Tracker is a **TC (Ticket Collector) tracking application** for mumbaikar's who travels from local trian and not purchse tickets, but are affraid to get caught by TC.
Built with **React Native (Expo)** and powered by **Supabase** as the backend.  
The app allows users to track and manage Ticket Collectors and help each others to not get vaught by TC, it has a mobile-friendly interface.

---

# 📱 App Overview

TC-Tracker is designed as a lightweight mobile app that provides:

- A modern mobile UI
- Real-time backend integration
- Secure API communication
- Fast development using Expo

---

# ✨ Features

- 📱 Cross-platform mobile app (Android / iOS)
- ⚡ Built with **React Native + Expo**
- 🔐 Backend powered by **Supabase**
- 🧠 TypeScript support for safer code
- ☁️ Cloud database integration
- 🚀 Fast development workflow

---

# 🛠 Tech Stack

| Technology | Purpose |
|------------|--------|
| React Native | Mobile app framework |
| Expo | Development environment |
| TypeScript | Type-safe JavaScript |
| Supabase | Backend / database |
| Node.js | Development runtime |

---

# 📂 Project Structure

```
TC-Tracker
│
├── assets/            # App icons and images
├── lib/
│   └── supabase.ts    # Supabase configuration
│
├── App.tsx            # Main application UI
├── index.ts           # Entry point
├── stations.ts        # Station data
├── scaling.ts         # UI scaling helpers
│
├── package.json
├── tsconfig.json
├── app.json
└── eas.json
```

---

# ⚙️ Installation

### 1️⃣ Clone the repository

```
git clone https://github.com/app-bana-be/TC-Tracker.git
```

### 2️⃣ Go into the project folder

```
cd TC-Tracker
```

### 3️⃣ Install dependencies

```
npm install
```

or

```
yarn install
```

---

# ▶️ Running the App

Start the Expo development server:

```
npm run start
```

or

```
expo start
```

Then open the app using:

- Android Emulator
- iOS Simulator
- Expo Go mobile app

---

# 🔑 Environment Variables

Create a `.env` file in the root directory.

Example:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ Important:

- Never commit `.env` files to GitHub
- Keep your API keys private

---

# ☁️ Supabase Integration

This project uses **Supabase** as the backend service.

Supabase provides:

- PostgreSQL database
- Authentication
- API services

Configuration file:

```
lib/supabase.ts
```

---

# 🚀 Deployment

You can build production apps using **Expo EAS Build**.

Example:

```
npx expo prebuild
npx eas build
```

For web deployment:

- Vercel
- Netlify

---

# 🤝 Contributing

Contributions are welcome!

Steps:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a Pull Request

---

# 📜 License

This project is open-source.

You can add the **MIT License** if you want others to freely use and modify the project.

---

# 👨‍💻 Author

Developed by **Ashok Patel**

GitHub:  
https://github.com/app-bana-be

---

⭐ If you like this project, consider giving it a **star on GitHub**!
