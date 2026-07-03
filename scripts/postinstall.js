const fs = require('fs');
const path = require('path');

// When npm runs this script, process.env.INIT_CWD is usually the root of the project where `npm install` was executed.
// If it's undefined, we fallback to two levels up (assuming node_modules/pwa-notifications)
const initCwd = process.env.INIT_CWD || path.resolve(process.cwd(), '..', '..');

// Avoid running in our own development environment
if (initCwd === process.cwd()) {
  console.log("Running in development environment, skipping injection.");
  process.exit(0);
}

const swContent = `self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || "New Notification";
  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || "/icon.png",
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
`;

const installPromptContent = `"use client";
import { useEffect, useState } from "react";
import { promptPWAInstall } from "pwa-notifications/client";

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  canInstall: boolean;
}

export default function InstallPrompt({ isOpen, onClose, canInstall }: InstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
  }, []);

  if (!isOpen) return null;

  const handleInstall = async () => {
    const installed = await promptPWAInstall();
    if (installed) onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '28rem', padding: '2rem', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.5rem', color: '#6b7280' }}>×</button>
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>Install App</h3>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '0.875rem' }}>Enjoy faster access and instant notifications.</p>
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          {canInstall ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#4b5563', marginBottom: '1rem', fontSize: '0.875rem' }}>Click below to install the app on your device.</p>
              <button onClick={handleInstall} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Add to Home Screen
              </button>
            </div>
          ) : isIOS ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>To install on iOS:</p>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '0.75rem' }}>1</div>
                <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>Tap the <strong>Share</strong> button at the bottom.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '0.75rem' }}>2</div>
                <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>Select <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>
          ) : isAndroid ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>To install on Android:</p>
               <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#4b5563', textAlign: 'center' }}>
                 Tap the menu button (⋮) and select <br/><strong>Add to Home screen</strong>
               </div>
            </div>
          ) : (
             <p style={{ textAlign: 'center', color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Please use a supported browser (like Chrome, Safari, or Edge) to install this app.</p>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const pushManagerContent = `"use client";
import { useEffect, useState } from "react";
import { subscribeToPush, isPushSupported } from "pwa-notifications/client";

export default function PushNotificationManager() {
  const [supported, setSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    if (isPushSupported()) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleToggleSubscription = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          setIsSubscribed(false);
          alert("Successfully unsubscribed from notifications.");
        }
      } else {
        const subscription = await subscribeToPush({
          vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY_HERE"
        });
        
        await fetch('/api/test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });
        
        setIsSubscribed(true);
        alert("Successfully subscribed to notifications!");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update subscription. Check browser permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!supported) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '0.5rem', fontFamily: 'sans-serif' }}>
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontFamily: 'sans-serif', maxWidth: '32rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 1rem 0' }}>Notification Settings</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: '#1f2937' }}>Push Notifications</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
            {isSubscribed ? "You are receiving updates and alerts." : "Get notified about new updates."}
          </p>
        </div>
        
        <button 
          onClick={handleToggleSubscription}
          disabled={isLoading}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: isSubscribed ? '#ef4444' : '#10b981', 
            color: 'white', 
            borderRadius: '0.375rem', 
            border: 'none', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? "Updating..." : isSubscribed ? "Unsubscribe" : "Subscribe"}
        </button>
      </div>
    </div>
  );
}
`;

const installSectionContent = `"use client";
import { useEffect, useState } from "react";
import { onPWAInstallable, promptPWAInstall } from "pwa-notifications/client";

export default function InstallSection() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(localStorage.getItem("installSectionDismissed") === "true");
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    
    const cleanup = onPWAInstallable((installable) => {
      setCanInstall(installable);
    });
    return cleanup;
  }, []);

  const handleInstallClick = async () => {
    const success = await promptPWAInstall();
    if (success) {
      setIsDismissed(true);
      localStorage.setItem("installSectionDismissed", "true");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("installSectionDismissed", "true");
  };

  if (isDismissed || (!canInstall && !isIOS && !isAndroid)) {
    return null;
  }

  // Generalized SVG Icons to avoid external dependencies
  const CheckIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  const MonitorIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
  const SmartphoneIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;

  return (
    <section style={{ backgroundColor: '#f3f4f6', padding: '4rem 1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'grid', gap: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
        
        <div>
          <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '9999px', marginBottom: '1rem' }}>
            Add to Home Screen
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Add Our App <span style={{ color: '#9ca3af', display: 'block' }}>to your home screen.</span>
          </h2>
          <p style={{ color: '#4b5563', fontSize: '1.125rem', marginBottom: '2rem' }}>
            Open faster, receive timely updates, and keep your work moving from any device.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
            {["Real-time alerts for updates", "Fast mobile access", "Available right from your home screen"].map(benefit => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#374151', fontWeight: 500 }}>
                <span style={{ color: '#10b981' }}><CheckIcon /></span> {benefit}
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            {canInstall ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '1rem' }}><MonitorIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>Install on Your Device</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Add to your home screen for faster access.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handleInstallClick} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: 'white', borderRadius: '9999px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Install</button>
                  <button onClick={handleDismiss} style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#374151', borderRadius: '9999px', fontWeight: 'bold', border: '1px solid #d1d5db', cursor: 'pointer' }}>Maybe Later</button>
                </div>
              </div>
            ) : isIOS ? (
              <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '1rem' }}><SmartphoneIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>Install on iOS</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Use Safari's share menu to add this app.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '1rem' }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: '#111827', color: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                    <div><p style={{ margin: 0, fontWeight: 600 }}>Tap the Share button</p><p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Bottom center or top right</p></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '1rem' }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: '#111827', color: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                    <div><p style={{ margin: 0, fontWeight: 600 }}>Select Add to Home Screen</p><p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Scroll down and tap</p></div>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
               <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', color: '#059669', borderRadius: '1rem' }}><SmartphoneIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>Install on Android</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Use your browser menu to install.</p>
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '1rem', fontSize: '0.875rem', textAlign: 'center', color: '#4b5563' }}>
                  Tap the Chrome menu and select <strong>Add to Home screen</strong>
                </div>
               </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '300px', height: '600px', backgroundColor: '#111827', borderRadius: '3rem', padding: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ width: '100%', height: '100%', backgroundColor: 'white', borderRadius: '2.25rem', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '40%', height: '1.5rem', backgroundColor: '#111827', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}></div>
              <div style={{ padding: '3rem 1.5rem', backgroundColor: '#f8fafc', height: '100%' }}>
                <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Today</p>
                  <h4 style={{ margin: '0.25rem 0 1rem 0', fontWeight: 'bold' }}>New Updates</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.75rem' }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem' }}></div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>5 New Matches</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Jobs matching your profile</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
`;

const reactComponentContent = `"use client";
import { useEffect, useState } from "react";
import { 
  registerServiceWorker, 
  subscribeToPush, 
  isPushSupported,
  onPWAInstallable
} from "pwa-notifications/client";
import InstallPrompt from "./InstallPrompt";

export default function EnableNotifications() {
  const [canInstall, setCanInstall] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    registerServiceWorker("/sw.js")
      .then(() => console.log("Service Worker Registered!"))
      .catch(console.error);

    const cleanup = onPWAInstallable((installable) => {
      setCanInstall(installable);
    });

    return cleanup;
  }, []);

  const handleSubscribe = async () => {
    if (!isPushSupported()) return alert("Push not supported in this browser!");

    try {
      const subscription = await subscribeToPush({
        vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY_HERE"
      });
      
      console.log("Subscription object to save in DB:", subscription);
      
      await fetch('/api/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
      
      alert("Successfully Subscribed!");
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to subscribe", error);
      alert("Failed to subscribe. Did you grant permission?");
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', backgroundColor: '#eff6ff', borderTop: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, fontFamily: 'sans-serif' }}>
        <div style={{ color: '#1e40af', fontWeight: 500 }}>
          Stay updated with our latest features!
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleSubscribe} 
            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            Enable Notifications
          </button>

          <button 
            onClick={() => setShowInstallPrompt(true)} 
            style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            Install App
          </button>
          
          <button 
            onClick={() => window.location.href = '/settings/notifications'} 
            style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 500 }}
          >
            Settings
          </button>
          
          <button 
            onClick={() => setIsVisible(false)} 
            style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#6b7280', borderRadius: '0.375rem', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 500 }}
          >
            Dismiss
          </button>
        </div>
      </div>

      <InstallPrompt 
        isOpen={showInstallPrompt} 
        onClose={() => setShowInstallPrompt(false)} 
        canInstall={canInstall}
      />
    </>
  );
}
`;

const manifestContent = `{
  "name": "PWA Notifications App",
  "short_name": "PWA App",
  "description": "An automatically generated PWA app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "/icon-512x512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
`;

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" fill="#3b82f6"/>
  <circle cx="96" cy="96" r="48" fill="#ffffff"/>
  <text x="96" y="105" font-family="Arial" font-size="24" fill="#3b82f6" text-anchor="middle">PWA</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#3b82f6"/>
  <circle cx="256" cy="256" r="128" fill="#ffffff"/>
  <text x="256" y="275" font-family="Arial" font-size="64" fill="#3b82f6" text-anchor="middle">PWA</text>
</svg>`;

function writeIfNotExist(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ pwa-notifications: Injected ${path.relative(initCwd, filePath)}`);
  } else {
    console.log(`ℹ️ pwa-notifications: File ${path.relative(initCwd, filePath)} already exists, skipping.`);
  }
}

function injectManifestAndComponent(initCwd, hasSrcDir) {
  const possibleFiles = [
    path.join(initCwd, 'src', 'app', 'layout.tsx'),
    path.join(initCwd, 'app', 'layout.tsx'),
    path.join(initCwd, 'src', 'app', 'layout.jsx'),
    path.join(initCwd, 'app', 'layout.jsx')
  ];

  for (const file of possibleFiles) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // 1. Inject Manifest Link
      const linkTag = `<link rel="manifest" href="/manifest.json" />`;
      if (!content.includes('rel="manifest"')) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `  ${linkTag}\n</head>`);
          modified = true;
        } else if (content.match(/<html[^>]*>/i)) {
          content = content.replace(/(<html[^>]*>)/i, `$1\n        <head>\n          ${linkTag}\n        </head>`);
          modified = true;
        }
      }
      
      // 2. Inject Component Import
      const importPath = hasSrcDir ? "@/components/pwa-notifications/EnableNotifications" : "@/components/pwa-notifications/EnableNotifications";
      // We use a relative path if we're unsure about @ alias, but most modern Next.js apps support @/components or relative from app
      // Let's use relative from layout.tsx
      const relativeImport = hasSrcDir ? "../components/pwa-notifications/EnableNotifications" : "../components/pwa-notifications/EnableNotifications";
      const relativeInstallSection = hasSrcDir ? "../components/pwa-notifications/InstallSection" : "../components/pwa-notifications/InstallSection";
      
      const componentImport = `import EnableNotifications from "${relativeImport}";\nimport InstallSection from "${relativeInstallSection}";\n`;
      if (!content.includes('EnableNotifications')) {
        content = componentImport + content;
        
        // 3. Render Components inside <body>
        if (content.match(/<body[^>]*>/i)) {
          // Inject EnableNotifications at the top of body or just inside it
          content = content.replace(/(<body[^>]*>)/i, `$1\n        <EnableNotifications />`);
          modified = true;
        }
      }
      
      if (!content.includes('<InstallSection />')) {
        // Inject InstallSection right before </body>
        if (content.includes('</body>')) {
          content = content.replace('</body>', `  <InstallSection />\n      </body>`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`✅ pwa-notifications: Injected manifest link, EnableNotifications, and InstallSection into ${path.relative(initCwd, file)}`);
      }
      return;
    }
  }
  
  console.log("⚠️ pwa-notifications: Could not find a layout file to auto-inject the banner. Please add <EnableNotifications /> manually.");
}

function generateAndInjectVapidKeys(initCwd) {
  const envLocalPath = path.join(initCwd, '.env.local');
  const envPath = path.join(initCwd, '.env');
  
  const targetEnvFile = fs.existsSync(envPath) && !fs.existsSync(envLocalPath) ? envPath : envLocalPath;

  let envContent = '';
  if (fs.existsSync(targetEnvFile)) {
    envContent = fs.readFileSync(targetEnvFile, 'utf8');
  }

  if (envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY')) {
    console.log(`ℹ️ pwa-notifications: VAPID keys already exist in ${path.relative(initCwd, targetEnvFile)}, skipping generation.`);
    return;
  }

  try {
    const webpush = require('web-push');
    const vapidKeys = webpush.generateVAPIDKeys();
    
    const keysToAdd = `\n# Generated by pwa-notifications\nNEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"\nVAPID_PRIVATE_KEY="${vapidKeys.privateKey}"\n`;
    
    fs.appendFileSync(targetEnvFile, keysToAdd);
    console.log(`✅ pwa-notifications: Generated and injected VAPID keys into ${path.relative(initCwd, targetEnvFile)}`);
  } catch (error) {
    console.error("❌ pwa-notifications: Failed to generate VAPID keys. web-push module might not be available yet.", error);
  }
}

try {
  const publicDir = path.join(initCwd, 'public');
  
  // Dynamically determine the best components directory
  const hasSrcDir = fs.existsSync(path.join(initCwd, 'src'));
  const baseComponentsDir = hasSrcDir 
    ? path.join(initCwd, 'src', 'components') 
    : path.join(initCwd, 'components');
    
  // Place the component in a dedicated subfolder to avoid clutter
  const pwaComponentsDir = path.join(baseComponentsDir, 'pwa-notifications');

  console.log("🚀 pwa-notifications: Auto-injecting PWA files...");
  writeIfNotExist(path.join(publicDir, 'sw.js'), swContent);
  writeIfNotExist(path.join(publicDir, 'manifest.json'), manifestContent);
  writeIfNotExist(path.join(publicDir, 'icon-192x192.svg'), svg192);
  writeIfNotExist(path.join(publicDir, 'icon-512x512.svg'), svg512);
  writeIfNotExist(path.join(pwaComponentsDir, 'EnableNotifications.tsx'), reactComponentContent);
  writeIfNotExist(path.join(pwaComponentsDir, 'InstallPrompt.tsx'), installPromptContent);
  writeIfNotExist(path.join(pwaComponentsDir, 'PushNotificationManager.tsx'), pushManagerContent);
  writeIfNotExist(path.join(pwaComponentsDir, 'InstallSection.tsx'), installSectionContent);
  
  // Create a settings page route
  const appDir = hasSrcDir ? path.join(initCwd, 'src', 'app') : path.join(initCwd, 'app');
  if (fs.existsSync(appDir)) {
    const settingsRouteDir = path.join(appDir, 'settings', 'notifications');
    fs.mkdirSync(settingsRouteDir, { recursive: true });
    
    // Calculate relative path from app/settings/notifications to components/pwa-notifications
    // If hasSrcDir: from src/app/settings/notifications to src/components/pwa-notifications -> ../../../components/pwa-notifications
    const relativeComponentPath = "../../../components/pwa-notifications/PushNotificationManager";
    
    const pageContent = `import PushNotificationManager from "${relativeComponentPath}";

export default function NotificationSettingsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '40rem', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem' }}>Notification Settings</h1>
      <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
        Manage your push notification preferences below.
      </p>
      <PushNotificationManager />
    </div>
  );
}
`;
    writeIfNotExist(path.join(settingsRouteDir, 'page.tsx'), pageContent);
    console.log("✅ pwa-notifications: Generated settings page at /settings/notifications");
  }
  
  injectManifestAndComponent(initCwd, hasSrcDir);
  generateAndInjectVapidKeys(initCwd);
  
  console.log("🎉 pwa-notifications: Injection complete!");
} catch (e) {
  console.error("❌ pwa-notifications: Error during postinstall injection:", e);
}

