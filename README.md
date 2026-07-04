# PWA Notifications Library

`pwa-notifications` is a framework-agnostic, zero-config toolkit designed to instantly equip your web applications with robust Progressive Web App (PWA) capabilities and Push Notifications. 

It handles the heavy lifting of service worker registration, VAPID key generation, manifest injection, and provides beautiful UI components.

## Features

- **Zero-Config Auto-Injection:** For Next.js projects, it automatically injects a `manifest.json`, standard PWA icons, and necessary code into your layout upon installation.
- **Auto-Generated VAPID Keys:** Automatically generates your push notification VAPID keys and safely injects them into your `.env.local` (or standard `.env`).
- **Universal Installation Prompts:** Detects the user's OS and provides tailored installation instructions for iOS, Android, and Desktop.
- **Push Notification Management:** Includes client hooks and server-side utilities for robust notification subscription and sending.
- **Framework Agnostic Core:** The core API functions are plain JavaScript, meaning they work flawlessly in Next.js, standard React (Vite/Create React App), Vue, and Svelte.

---

## Installation

Install the library in your target project:

\`\`\`bash
npm install pwa-notifications
\`\`\`

### What happens when you install?
If you are using **Next.js**, the powerful `postinstall` script runs and automatically:
1. Generates `manifest.json` and PWA icons in your `public/` directory.
2. Creates reusable React UI components in `components/pwa-notifications/`.
3. Injects the `EnableNotifications` banner into your `app/layout.tsx`.
4. Creates a dedicated notification settings page at `app/settings/notifications/page.tsx`.
5. Generates Firebase-compatible VAPID keys into your `.env.local`.

If you are using **Standard React (Vite)** or **Vue**, the script will still generate your VAPID keys and Service Worker (`public/sw.js`), but you will manually assemble the UI using the provided agnostic API.

---

## Usage in Next.js

Because the components are auto-injected directly into your `components/pwa-notifications/` folder, you have complete freedom to customize their styling and logic.

### 1. EnableNotifications (The Banner)
A sleek, sticky banner auto-injected at the bottom of your layout. It prompts users to enable push notifications or install the app.

### 2. InstallPrompt (The Modal)
A comprehensive modal that displays OS-specific instructions (iOS Share -> Add to Home Screen, Android Chrome Menu, etc.). Opens automatically when users click "Install App" on the banner.

### 3. PushNotificationManager (The Settings Panel)
A customizable settings block showing the user's current subscription status and offering Subscribe/Unsubscribe controls. Automatically rendered on the auto-generated `/settings/notifications` page.

### 4. InstallSection (The Landing Page Block)
A massive, highly-visual marketing block designed to be placed on your homepage to convince users to install the app. Auto-injected at the very bottom of your `layout.tsx`.

---

## Usage in Standard React (Vite / CRA)

In a standard React project, you can use the core API hooks directly to build your own components, or copy the injected Next.js components and adapt them.

\`\`\`tsx
import { useEffect, useState } from 'react';
import { 
  registerServiceWorker, 
  subscribeToPush, 
  isPushSupported,
  onPWAInstallable,
  promptPWAInstall 
} from "pwa-notifications/client";

export default function App() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    registerServiceWorker("/sw.js");
    return onPWAInstallable((installable) => setCanInstall(installable));
  }, []);

  const handleSubscribe = async () => {
    if (!isPushSupported()) return alert("Push not supported!");
    const subscription = await subscribeToPush({
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY // Adjust based on your bundler
    });
    // Send subscription to your backend
  };

  return (
    <div>
      <button onClick={handleSubscribe}>Enable Notifications</button>
      {canInstall && <button onClick={promptPWAInstall}>Install App</button>}
    </div>
  );
}
\`\`\`

---

## Usage in Vue 3

Because the core client library is pure JavaScript, you can easily use it in Vue 3 component setups.

\`\`\`vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  registerServiceWorker, 
  subscribeToPush, 
  isPushSupported,
  onPWAInstallable,
  promptPWAInstall 
} from "pwa-notifications/client";

const canInstall = ref(false);
let cleanupInstallable = null;

onMounted(() => {
  registerServiceWorker("/sw.js");
  cleanupInstallable = onPWAInstallable((installable) => {
    canInstall.value = installable;
  });
});

onUnmounted(() => {
  if (cleanupInstallable) cleanupInstallable();
});

const handleSubscribe = async () => {
  if (!isPushSupported()) return alert("Push not supported!");
  const subscription = await subscribeToPush({
    vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
  });
  // Send subscription to your backend
};
</script>

<template>
  <div>
    <button @click="handleSubscribe">Enable Notifications</button>
    <button v-if="canInstall" @click="promptPWAInstall">Install App</button>
  </div>
</template>
\`\`\`

---

## Server-Side API

Import from `pwa-notifications/server` to send push notifications from your Node.js, Express, Next.js, or Nuxt backend routes:

\`\`\`typescript
import { sendPushNotification } from "pwa-notifications/server";

// Example payload structure
const subscription = { /* Retrieved from database */ };

await sendPushNotification(subscription, {
  title: "New Alert!",
  body: "You have a new message.",
  icon: "/icon-192x192.svg",
  url: "/"
}, {
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
});
\`\`\`

## Requirements
- Browser with Service Worker Support
- HTTPS (or localhost for development)
- Node.js environment for sending notifications

---

## Real-Time Hybrid Notification Pattern (Architecture Guide)

For complex applications (like marketplaces or dashboard systems), developers often need **real-time UI updates** combined with **OS-level PWA background push notifications**.

A generic, highly efficient architecture is the **Hybrid Database/Real-Time Sync Pattern**:

### 1. The Architecture Flow
1. **Neon/Postgres/MySQL DB**: The source of truth. All user notifications are persisted relationally.
2. **Firestore (or any socket/SSE/Supabase Realtime Channel)**: A lightweight websocket trigger. Instead of keeping database sockets open, a simple counter (e.g. `notificationTrigger`) is incremented when a notification is created.
3. **`pwa-notifications`**: Registers the service worker and registers the subscriber endpoint for OS-level background notifications.

### 2. Implementation Example

#### Client-Side Hook (React / Vue)
Subscribe to the real-time trigger (like Firestore or Supabase) to instantly refresh your SQL database notification records on the UI:

```typescript
import { useEffect, useState } from "react";
import { registerServiceWorker, subscribeToPush } from "pwa-notifications/client";
import { onSnapshot, doc } from "firebase/firestore"; // Or your preferred websocket listener

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState([]);

  const fetchFromDB = async () => {
    const res = await fetch(`/api/notifications?userId=${userId}`);
    const data = await res.json();
    setNotifications(data);
  };

  useEffect(() => {
    // 1. Register PWA Service Worker
    registerServiceWorker("/sw.js");

    // 2. Real-time trigger: refresh UI list when counter updates
    const unsubscribe = onSnapshot(doc(db, "users", userId), () => {
      fetchFromDB();
    });

    return () => unsubscribe();
  }, [userId]);

  return { notifications };
}
```

#### Server-Side Dispatcher
When sending a notification, write to your database, update the real-time websocket trigger, and send the background push payload:

```typescript
import { sendPushNotification } from "pwa-notifications/server";
import { db } from "@/db"; // Your Drizzle or Prisma client

export async function notifyUser(userId: string, alert: { title: string; body: string }) {
  // 1. Persist to Postgres/SQL DB
  const [notification] = await db.insert(notifications).values({
    userId,
    title: alert.title,
    message: alert.body,
    read: false
  }).returning();

  // 2. Update real-time websocket/Firestore counter to refresh recipient's active UI
  await firestore.collection("users").doc(userId).update({
    notificationTrigger: increment(1)
  });

  // 3. Dispatch OS-level background push notification via pwa-notifications
  const subscription = await getPushSubscriptionFromDB(userId);
  if (subscription) {
    await sendPushNotification(subscription, {
      title: alert.title,
      body: alert.body,
      icon: "/icon-192x192.svg",
      url: `/alerts/${notification.id}`
    }, {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
    });
  }
}
```


## Contributing
Contributions to the auto-injection script to support automatic component generation for Vue and Vite are welcome!
