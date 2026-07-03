export interface PushSubscriptionOptions {
  vapidKey: string;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(
  swPath: string = "/sw.js"
): Promise<ServiceWorkerRegistration | undefined> {
  if (!isPushSupported()) return undefined;
  try {
    const registration = await navigator.serviceWorker.register(swPath);
    return registration;
  } catch (error) {
    console.error("Error registering service worker:", error);
    throw error;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("Error getting subscription:", error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(
  options: PushSubscriptionOptions
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission denied");
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(options.vapidKey) as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    throw error;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return false;
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return false;
  }
}

// PWA Install API
let deferredPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone)
  );
}

export function canInstallPWA(): boolean {
  return !!deferredPrompt;
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

export function onPWAInstallable(callback: (canInstall: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleBeforeInstallPrompt = (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    callback(true);
  };

  const handleAppInstalled = () => {
    deferredPrompt = null;
    callback(false);
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  // Initial check
  callback(canInstallPWA());

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}
