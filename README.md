# PWA Notifications

[![Latest Version](https://img.shields.io/npm/v/pwa-notifications.svg)](https://www.npmjs.com/package/pwa-notifications)
[![Total Downloads](https://img.shields.io/npm/dt/pwa-notifications.svg)](https://www.npmjs.com/package/pwa-notifications)
[![License](https://img.shields.io/npm/l/pwa-notifications.svg)](https://www.npmjs.com/package/pwa-notifications)

A framework-agnostic, zero-config toolkit designed to instantly equip your web applications with robust Progressive Web App (PWA) capabilities and Push Notifications. It handles the heavy lifting of service worker registration, VAPID key generation, manifest injection, and provides beautiful UI components.

## Features

- **Zero-Config Auto-Injection:** Automatically injects `manifest.json`, standard PWA icons, and necessary code into Next.js layout upon installation.
- **Auto-Generated VAPID Keys:** Safely generates and injects your push notification VAPID keys into `.env.local` or `.env`.
- **Universal Installation Prompts:** Detects user OS and provides tailored installation instructions for iOS, Android, and Desktop.
- **Push Notification Management:** Client hooks and server-side utilities for robust notification subscription and sending.
- **Framework Agnostic Core:** Works flawlessly in Next.js, standard React (Vite/CRA), Vue, and Svelte.

## Quick Installation

```bash
npm install pwa-notifications
```

### Post-Installation

If you are using **Next.js**, a `postinstall` script runs automatically:

1. Generates `manifest.json` and PWA icons in `public/`.
2. Creates reusable React UI components in `components/pwa-notifications/`.
3. Injects the `EnableNotifications` banner into `app/layout.tsx`.
4. Creates a notification settings page at `app/settings/notifications/page.tsx`.
5. Generates Firebase-compatible VAPID keys into `.env.local`.

For **Standard React (Vite)** or **Vue**, the script generates VAPID keys and `public/sw.js`, but you will manually assemble the UI using the provided API.

## Usage

### Usage in Next.js

Components are auto-injected directly into your `components/pwa-notifications/` folder for complete freedom to customize.

- **EnableNotifications:** A sleek, sticky banner auto-injected at the bottom of your layout.
- **InstallPrompt:** OS-specific instructions modal (iOS Share, Android Chrome Menu, etc.).
- **PushNotificationManager:** Customizable settings block showing subscription status.
- **InstallSection:** Massive, highly-visual marketing block for your homepage.

### Usage in Standard React (Vite / CRA)

```tsx
import { useEffect, useState } from "react";
import {
  registerServiceWorker,
  subscribeToPush,
  isPushSupported,
  onPWAInstallable,
  promptPWAInstall,
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
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY, // Adjust based on your bundler
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
```

### Usage in Vue 3

```vue
<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import {
  registerServiceWorker,
  subscribeToPush,
  isPushSupported,
  onPWAInstallable,
  promptPWAInstall,
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
    vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
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
```

## Server-Side API

Import from `pwa-notifications/server` to send push notifications from Node.js, Express, Next.js, or Nuxt:

```typescript
import { sendPushNotification } from "pwa-notifications/server";

// Example payload structure
const subscription = {
  /* Retrieved from database */
};

await sendPushNotification(
  subscription,
  {
    title: "New Alert!",
    body: "You have a new message.",
    icon: "/icon-192x192.svg",
    url: "/",
  },
  {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  },
);
```

## Architecture Guide: Real-Time Hybrid Notification Pattern

For complex applications (like marketplaces or dashboard systems), developers often need **real-time UI updates** combined with **OS-level PWA background push notifications**.

A generic, highly efficient architecture is the **Hybrid Database/Real-Time Sync Pattern**:

1. **Database**: Source of truth (Neon, Postgres, MySQL).
2. **Real-Time Trigger**: Firestore, SSE, or Supabase. A counter is incremented when a notification is created.
3. **PWA Notifications**: Registers service worker and subscriber endpoint.

React Hook Example:

```typescript
import { useEffect, useState } from "react";
import {
  registerServiceWorker,
  subscribeToPush,
} from "pwa-notifications/client";
import { onSnapshot, doc } from "firebase/firestore"; // Or your preferred websocket listener

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 1. Register PWA Service Worker
    registerServiceWorker("/sw.js");

    // 2. Real-time trigger: refresh UI list when counter updates
    const unsubscribe = onSnapshot(doc(db, "users", userId), () => {
      // Fetch notifications from DB and update UI
    });

    return () => unsubscribe();
  }, [userId]);

  return { notifications };
}
```

## Requirements

- Browser with Service Worker Support
- HTTPS (or localhost for development)
- Node.js environment for sending notifications

## License

MIT License

## Author

**Rey Mark Tapar**

[Website](https://reymarktapar.vercel.app) | [GitHub](https://github.com/dev-reymark/pwa-notifications)
