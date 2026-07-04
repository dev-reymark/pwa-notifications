/**
 * postinstall.js — pwa-notifications auto-injector
 *
 * This script runs automatically after `npm install`. It detects the host
 * project's framework (Next.js, React/Vite, Vue) and injects:
 *   - public/sw.js              → Service Worker for push events
 *   - public/manifest.json      → Web App Manifest for PWA installability
 *   - public/icon-*.svg         → Default app icons
 *   - components/pwa-notifications/
 *       EnableNotifications.tsx → Registers the service worker on mount
 *       InstallSection.tsx      → Install banner + standalone notification settings
 *       InstallPrompt.tsx       → Modal guiding users through installation
 *       PushNotificationManager.tsx → Push subscription toggle + test notification
 *   - .env.local                → Auto-generated VAPID key pair
 *
 * Files are only written if they don't already exist (safe to re-run).
 * Layout/entry-point injection is also idempotent.
 *
 * To customise the injected templates, edit the `*Content` variables below
 * and rebuild the package with `npm run build`.
 */

const fs = require('fs');
const path = require('path');

// INIT_CWD is set by npm to the directory where `npm install` was run.
// Falls back to two directories up when running as a linked/local package.
const initCwd = process.env.INIT_CWD || process.env.PROJECT_CWD || path.resolve(process.cwd(), '..', '..');

// Skip injection when developing pwa-notifications itself.
if (initCwd === process.cwd()) {
  console.log("Running in development environment, skipping injection.");
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER TEMPLATE
// Handles incoming push events and notification click actions.
// Written to public/sw.js — extend this if you need custom offline caching.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT TEMPLATES
// These strings are written verbatim to the host project as .tsx/.jsx files.
// TypeScript generics are stripped at runtime for JS-only projects via
// the stripTypeScript() helper below.
// ─────────────────────────────────────────────────────────────────────────────

// InstallPrompt — modal that walks the user through installing the PWA.
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    const checkDark = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDark(isDarkClass);
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!isOpen) return null;

  const handleInstall = async () => {
    const installed = await promptPWAInstall();
    if (installed) onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: isDark ? '#1e293b' : 'white',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '26rem',
        padding: '1.5rem',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: isDark ? '1px solid #334155' : '1px solid #f1f5f9'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
            Install App
          </h3>
        </div>

        {/* Body */}
        <div style={{ marginBottom: '1.75rem' }}>
          {canInstall ? (
            <p style={{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Would you like to install this application to your home screen? This gives you quick, one-tap access and supports offline capabilities.
            </p>
          ) : isIOS ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                To add this app to your home screen:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', backgroundColor: isDark ? '#38bdf8' : '#0f172a', color: isDark ? '#0f172a' : 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>1</div>
                <span style={{ fontSize: '0.8125rem', color: isDark ? '#e2e8f0' : '#334155' }}>Tap the <strong>Share</strong> button (bottom or top right).</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', backgroundColor: isDark ? '#38bdf8' : '#0f172a', color: isDark ? '#0f172a' : 'white', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>2</div>
                <span style={{ fontSize: '0.8125rem', color: isDark ? '#e2e8f0' : '#334155' }}>Select <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>
          ) : isAndroid ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                To add this app to your home screen:
              </p>
              <div style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.8125rem', color: isDark ? '#e2e8f0' : '#334155', textAlign: 'center', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }}>
                Tap the menu button (<strong>⋮</strong>) and select <br/><strong>Add to Home screen</strong>
              </div>
            </div>
          ) : (
            <p style={{ color: isDark ? '#94a3b8' : '#64748b', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Installation is not supported on this browser. Please open this app in Chrome, Safari, or Edge to install.
            </p>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: isDark ? '#f87171' : '#ef4444',
              borderRadius: '0.75rem',
              border: 'none',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          
          {canInstall && (
            <button
              onClick={handleInstall}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: isDark ? '#006fee' : '#0f172a',
                color: 'white',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                boxShadow: isDark ? '0 4px 6px -1px rgba(0, 111, 238, 0.2)' : '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#005bc4' : '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#006fee' : '#0f172a'}
            >
              Install
            </button>
          )}
          
          {!canInstall && (
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: isDark ? '#006fee' : '#0f172a',
                color: 'white',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#005bc4' : '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#006fee' : '#0f172a'}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
`;

// PushNotificationManager — toggle for push subscription + test notification button.
const pushManagerContent = `"use client";
import { useEffect, useState } from "react";
import { subscribeToPush, isPushSupported } from "pwa-notifications/client";

export default function PushNotificationManager() {
  const [supported, setSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    if (isPushSupported()) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }

    const checkDark = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDark(isDarkClass);
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleSendTestNotification = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }
      const reg = await navigator.serviceWorker.ready;
      if (!reg) {
        throw new Error('No active Service Worker found');
      }
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted. Please enable it in browser settings.');
      }
      await reg.showNotification("Test Notification", {
        body: "This is a simulated push notification from your settings modal!",
        icon: "/icon-192x192.svg",
        data: { url: window.location.origin }
      });
      showToast("Test notification sent!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to trigger notification", "error");
    }
  };

  const handleToggleSubscription = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          setIsSubscribed(false);
          showToast("Successfully unsubscribed from notifications.", "info");
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
        showToast("Successfully subscribed to notifications!", "success");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to update subscription. Check permissions.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!supported) {
    return (
      <div style={{ padding: '1rem', backgroundColor: isDark ? '#27272a' : '#fef3c7', color: isDark ? '#f4f4f5' : '#92400e', borderRadius: '0.5rem', fontFamily: 'sans-serif', border: isDark ? '1px solid #3f3f46' : 'none' }}>
        Push notifications are not supported in this browser.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ padding: '1.5rem', backgroundColor: isDark ? '#1e293b' : 'white', border: isDark ? '1px solid #334155' : '1px solid #e5e7eb', borderRadius: '0.75rem', fontFamily: 'sans-serif', maxWidth: '32rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: isDark ? '#f8fafc' : '#1f2937' }}>Push Notifications</p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#6b7280' }}>
              {isSubscribed ? "You are receiving updates and alerts." : "Get notified about new updates."}
            </p>
          </div>
          
          <label style={{ 
            position: 'relative', 
            display: 'inline-flex', 
            alignItems: 'center', 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            userSelect: 'none'
          }}>
            <input 
              type="checkbox" 
              checked={isSubscribed} 
              onChange={handleToggleSubscription}
              disabled={isLoading}
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                border: '0'
              }}
            />
            <div style={{
              width: '2.75rem',
              height: '1.5rem',
              backgroundColor: isSubscribed ? '#006fee' : isDark ? '#3f3f46' : '#e4e4e7',
              borderRadius: '9999px',
              position: 'relative',
              transition: 'background-color 0.2s',
              opacity: isLoading ? 0.7 : 1
            }}>
              <div style={{
                width: '1.125rem',
                height: '1.125rem',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '0.1875rem',
                left: isSubscribed ? '1.4375rem' : '0.1875rem',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
              }} />
            </div>
          </label>
        </div>
        {isSubscribed && (
          <div style={{ marginTop: '1.25rem', borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSendTestNotification}
              disabled={isLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isDark ? '#3f3f46' : '#f1f5f9',
                color: isDark ? '#f8fafc' : '#334155',
                borderRadius: '0.5rem',
                border: isDark ? '1px solid #4b5563' : '1px solid #cbd5e1',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#52525b' : '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#3f3f46' : '#f1f5f9';
              }}
            >
              Send Test Notification
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 300,
          backgroundColor: isDark ? '#1e293b' : 'white',
          borderRadius: '0.75rem',
          padding: '1rem',
          boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid ' + (toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'),
          borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
          borderRight: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          minWidth: '18rem',
          maxWidth: '24rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{ color: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', display: 'flex', flexShrink: 0 }}>
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            )}
          </div>
          <div style={{ flex: 1, fontSize: '0.875rem', color: isDark ? '#f1f5f9' : '#334155', fontWeight: 500 }}>
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem', padding: 0, outline: 'none' }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
`;

// InstallSection — install banner for browser visitors; notification settings for installed PWA.
const installSectionContent = `"use client";
import { useEffect, useState } from "react";
import { onPWAInstallable, promptPWAInstall, isPWAInstalled } from "pwa-notifications/client";
import PushNotificationManager from "./PushNotificationManager";
import InstallPrompt from "./InstallPrompt";

interface InstallSectionProps {
  appName?: string;
}

export default function InstallSection({ appName: propAppName }: InstallSectionProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [appName, setAppName] = useState(propAppName || "Our App");
  const [appDescription, setAppDescription] = useState("Always Connected");
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [devWarnings, setDevWarnings] = useState<string[]>([]);

  const isDev = process.env.NODE_ENV === 'development';

  // Logs to console AND (in dev) surfaces the message in the in-browser overlay.
  const warn = (msg: string) => {
    console.warn(msg);
    if (isDev) setDevWarnings(prev => prev.includes(msg) ? prev : [...prev, msg]);
  };

  useEffect(() => {
    setIsDismissed(localStorage.getItem("installSectionDismissed") === "true");
    setIsInstalled(isPWAInstalled());
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    fetch("/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (!propAppName && (data.short_name || data.name)) {
          setAppName(data.short_name || data.name);
        }
        if (data.description) {
          setAppDescription(data.description);
        }
        // Validate icons — missing or empty src will prevent PWA installability
        if (Array.isArray(data.icons)) {
          data.icons.forEach((icon) => {
            if (!icon.src) {
              warn(
                'manifest.json has an icon with an empty or missing "src". ' +
                'This will prevent the PWA from being installable on some browsers. ' +
                'Icon entry: ' + JSON.stringify(icon)
              );
              return;
            }
            fetch(icon.src, { method: 'HEAD' }).then((r) => {
              if (!r.ok) {
                warn(
                  'manifest.json icon not found: "' + icon.src + '" (HTTP ' + r.status + '). ' +
                  'Make sure the file exists in your public/ directory.'
                );
              }
            }).catch(() => {
              warn(
                'Could not reach manifest icon: "' + icon.src + '". ' +
                'Make sure the file exists in your public/ directory.'
              );
            });
          });
        }
      })
      .catch(() => {
        warn(
          'Could not load /manifest.json. ' +
          'Make sure the file exists in your public/ directory. ' +
          'Falling back to default app name and description.'
        );
      });
    
    const cleanup = onPWAInstallable((installable) => {
      setCanInstall(installable);
    });

    const checkDark = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDark(isDarkClass);
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const handleAppInstalled = () => {
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      cleanup();
      observer.disconnect();
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [propAppName]);

  const handleInstallClick = () => {
    setShowInstallPrompt(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("installSectionDismissed", "true");
  };

  // Dev-only in-browser warning overlay — hidden in production and when no warnings.
  // Defined here so it's available on every return path below.
  const devOverlay = isDev && devWarnings.length > 0 ? (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      zIndex: 9999,
      width: '22rem',
      maxWidth: 'calc(100vw - 2rem)',
      borderRadius: '0.875rem',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.75rem',
    }}>
      <div style={{ backgroundColor: '#78350f', padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem' }}>⚠️</span>
          <span style={{ color: '#fef3c7', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>pwa-notifications · dev</span>
        </div>
        <button onClick={() => setDevWarnings([])} title="Dismiss all" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.375rem', color: '#fde68a', cursor: 'pointer', padding: '0.125rem 0.5rem', fontSize: '0.65rem', fontFamily: 'inherit', letterSpacing: '0.03em' }}>dismiss all</button>
      </div>
      <div style={{ backgroundColor: '#1c1007', maxHeight: '16rem', overflowY: 'auto' }}>
        {devWarnings.map((msg, i) => (
          <div key={i} style={{ padding: '0.625rem 0.875rem', borderTop: i === 0 ? 'none' : '1px solid rgba(251,191,36,0.1)', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#fbbf24', flexShrink: 0, marginTop: '0.05rem' }}>›</span>
            <span style={{ color: '#fde68a', lineHeight: 1.5, flex: 1, wordBreak: 'break-word' }}>{msg}</span>
            <button onClick={() => setDevWarnings(prev => prev.filter((_, j) => j !== i))} title="Dismiss" style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '0.875rem', padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // null = not yet checked (SSR / before useEffect). Render nothing until we know.
  if (isInstalled === null) return devOverlay;

  const shouldShowManager = isInstalled || (!canInstall && !isIOS && !isAndroid);

  if (isDismissed) {
    return devOverlay;
  }

  if (shouldShowManager) {
    return (
      <>
        <section style={{ backgroundColor: isDark ? '#0f172a' : '#f3f4f6', padding: '2rem 1.5rem', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '32rem' }}>
            <PushNotificationManager />
          </div>
        </section>
        {devOverlay}
      </>
    );
  }

  // Generalized SVG Icons to avoid external dependencies
  const CheckIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  const MonitorIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
  const SmartphoneIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;

  return (
    <>
      <section style={{ backgroundColor: isDark ? '#0f172a' : '#f3f4f6', padding: '4rem 1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'grid', gap: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'center' }}>
        
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: isDark ? '#f8fafc' : '#111827', margin: '0 0 1rem 0', lineHeight: 1.2 }}>
            Add {appName} <span style={{ color: isDark ? '#4b5563' : '#9ca3af', display: 'block' }}>to your home screen.</span>
          </h2>
          <p style={{ color: isDark ? '#94a3b8' : '#4b5563', fontSize: '1.125rem', marginBottom: '2rem' }}>
            Open faster, receive timely updates, and keep your work moving from any device.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
            {["Real-time alerts for updates", "Fast mobile access", "Available right from your home screen"].map(benefit => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: isDark ? '#cbd5e1' : '#374151', fontWeight: 500 }}>
                <span style={{ color: '#10b981' }}><CheckIcon /></span> {benefit}
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: isDark ? '#1e293b' : 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: isDark ? '1px solid #334155' : 'none' }}>
            {canInstall ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: isDark ? '#0f172a' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : 'none' }}><MonitorIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#111827' }}>Install on Your Device</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#6b7280' }}>Add to your home screen for faster access.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handleInstallClick} style={{ flex: 1, padding: '0.75rem', backgroundColor: isDark ? '#006fee' : '#111827', color: 'white', borderRadius: '9999px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Install</button>
                  <button onClick={() => setIsSettingsOpen(true)} style={{ flex: 1, padding: '0.75rem', backgroundColor: isDark ? '#1e293b' : 'white', color: isDark ? '#cbd5e1' : '#374151', borderRadius: '9999px', fontWeight: 'bold', border: isDark ? '1px solid #334155' : '1px solid #d1d5db', cursor: 'pointer', textAlign: 'center' }}>Settings</button>
                </div>
              </div>
            ) : isIOS ? (
              <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: isDark ? '#0f172a' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : 'none' }}><SmartphoneIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#111827' }}>Install on iOS</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#6b7280' }}>Use Safari's share menu to add this app.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '0.75rem', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : 'none' }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: isDark ? '#38bdf8' : '#111827', color: isDark ? '#0f172a' : 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                    <div><p style={{ margin: 0, fontWeight: 600, color: isDark ? '#f1f5f9' : '#000' }}>Tap the Share button</p><p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280' }}>Bottom center or top right</p></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '0.75rem', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : 'none' }}>
                    <div style={{ width: '2rem', height: '2rem', backgroundColor: isDark ? '#38bdf8' : '#111827', color: isDark ? '#0f172a' : 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                    <div><p style={{ margin: 0, fontWeight: 600, color: isDark ? '#f1f5f9' : '#000' }}>Select Add to Home Screen</p><p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280' }}>Scroll down and tap</p></div>
                  </div>
                </div>
              </div>
            ) : isAndroid ? (
               <div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: isDark ? '#0f2f1d' : '#d1fae5', color: isDark ? '#34d399' : '#059669', borderRadius: '1rem', border: isDark ? '1px solid #10b981' : 'none' }}><SmartphoneIcon /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#111827' }}>Install on Android</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#6b7280' }}>Use your browser menu to install.</p>
                  </div>
                </div>
                <div style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: '1rem', borderRadius: '1rem', fontSize: '0.875rem', textAlign: 'center', color: isDark ? '#cbd5e1' : '#4b5563', border: isDark ? '1px solid #1e293b' : 'none' }}>
                  Tap the Chrome menu and select <strong>Add to Home screen</strong>
                </div>
               </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', width: '100%' }}>
          {/* Background Card Shadow & Blur Effect */}
          <div style={{ position: 'absolute', left: '2rem', right: '2rem', top: '2rem', bottom: '2rem', borderRadius: '44px', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.6)', backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)', boxShadow: isDark ? '0 30px 120px rgba(0, 0, 0, 0.5)' : '0 30px 120px rgba(148, 163, 184, 0.16)', backdropFilter: 'blur(24px)', zIndex: 0 }} />

          {/* Premium Phone Mockup Container */}
          <div style={{ position: 'relative', width: '18rem', borderRadius: '3rem', backgroundColor: '#0f172a', padding: '3px', boxShadow: '0 35px 110px rgba(15, 23, 42, 0.28)', zIndex: 1 }}>
            <div style={{ width: '100%', height: '520px', backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: '2.8rem', overflow: 'hidden', position: 'relative' }}>
              
              {/* iPhone Status Bar / Notch */}
              <div style={{ display: 'flex', height: '2.25rem', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1.5rem', paddingRight: '1.5rem', fontSize: '12px', fontWeight: '600', color: isDark ? '#cbd5e1' : '#0f172a', position: 'relative', zIndex: 10 }}>
                <span>9:41</span>
                <div style={{ position: 'absolute', left: '50%', top: 0, height: '1.5rem', width: '7rem', transform: 'translateX(-50%)', backgroundColor: '#0f172a', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ display: 'block', height: '0.625rem', width: '1rem', borderRadius: '4px', border: '1px solid ' + (isDark ? '#cbd5e1' : '#0f172a'), position: 'relative' }}>
                    <span style={{ display: 'block', position: 'absolute', top: '1px', bottom: '1px', left: '1px', right: '3px', backgroundColor: isDark ? '#cbd5e1' : '#0f172a', borderRadius: '2px' }} />
                  </span>
                </div>
              </div>

              {/* App Logo & Header Block */}
              <div style={{ borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingBottom: '1rem', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', height: '1.5rem', width: '1.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: isDark ? '#f8fafc' : '#0f172a', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', color: isDark ? '#0f172a' : 'white', flexShrink: 0 }}>
                  {appName.charAt(0).toLowerCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {appName}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appDescription}</p>
                </div>
              </div>

              {/* Main Content Area / Notifications */}
              <div style={{ backgroundColor: isDark ? '#0b0f19' : '#f8fafc', padding: '1rem', paddingBottom: '7.5rem', height: 'calc(100% - 6rem)', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div style={{ borderRadius: '24px', border: isDark ? '1px solid #1e293b' : '1px solid rgba(255, 255, 255, 0.8)', backgroundColor: isDark ? '#0f172a' : '#ffffff', padding: '1rem', boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.2)' : '0 10px 30px rgba(148, 163, 184, 0.08)' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</p>
                  <h3 style={{ margin: '0.25rem 0 1rem 0', fontSize: '1.125rem', fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.02em' }}>New Updates</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Alert 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', backgroundColor: isDark ? '#1e293b' : 'rgba(248, 250, 252, 0.8)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', height: '2.25rem', width: '2.25rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', backgroundColor: isDark ? '#052e16' : '#ecfdf5', color: '#10b981' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.8125rem', color: isDark ? '#f8fafc' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>5 New Matches</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Jobs matching your profile</p>
                      </div>
                    </div>

                    {/* Alert 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '1rem', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', backgroundColor: isDark ? '#1e293b' : 'rgba(248, 250, 252, 0.8)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', height: '2.25rem', width: '2.25rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', backgroundColor: isDark ? '#3b0764' : '#f3e8ff', color: '#a855f7' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.8125rem', color: isDark ? '#f8fafc' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>12 Alerts</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>New job postings</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Navigation Tab Bar */}
              <div style={{ position: 'absolute', bottom: '1.75rem', left: '50%', width: '84%', transform: 'translateX(-50%)', borderRadius: '20px', border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)', padding: '0.375rem', boxShadow: isDark ? '0 12px 35px rgba(0, 0, 0, 0.4)' : '0 12px 35px rgba(148, 163, 184, 0.2)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.125rem', zIndex: 20 }}>
                <div style={{ borderRadius: '12px', padding: '0.375rem 0.125rem', textAlign: 'center', color: '#006fee' }}>
                  <svg style={{ margin: '0 auto', display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  <span style={{ marginTop: '3px', display: 'block', fontSize: '9px', fontWeight: '600' }}>Jobs</span>
                </div>
                <div style={{ borderRadius: '12px', padding: '0.375rem 0.125rem', textAlign: 'center', color: isDark ? '#475569' : '#94a3b8' }}>
                  <svg style={{ margin: '0 auto', display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <span style={{ marginTop: '3px', display: 'block', fontSize: '9px', fontWeight: '600' }}>Saved</span>
                </div>
                <div style={{ borderRadius: '12px', padding: '0.375rem 0.125rem', textAlign: 'center', color: isDark ? '#475569' : '#94a3b8' }}>
                  <svg style={{ margin: '0 auto', display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span style={{ marginTop: '3px', display: 'block', fontSize: '9px', fontWeight: '600' }}>Alerts</span>
                </div>
                <div style={{ borderRadius: '12px', padding: '0.375rem 0.125rem', textAlign: 'center', color: isDark ? '#475569' : '#94a3b8' }}>
                  <svg style={{ margin: '0 auto', display: 'block' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span style={{ marginTop: '3px', display: 'block', fontSize: '9px', fontWeight: '600' }}>Profile</span>
                </div>
              </div>

              {/* iPhone Home Indicator */}
              <div style={{ position: 'absolute', bottom: '8px', left: '50%', height: '5px', width: '80px', transform: 'translateX(-50%)', borderRadius: '9999px', backgroundColor: isDark ? '#334155' : '#e2e8f0', zIndex: 20 }} />

            </div>
          </div>
        </div>

      </div>

      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '30rem',
            padding: '1.5rem',
            boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                Notification Settings
              </h3>
            </div>
            
            {/* Modal Body */}
            <div style={{ marginBottom: '1.5rem' }}>
              <PushNotificationManager />
            </div>
            
            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: isDark ? '#006fee' : '#0f172a',
                  color: 'white',
                  borderRadius: '0.75rem',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#005bc4' : '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#006fee' : '#0f172a'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <InstallPrompt 
        isOpen={showInstallPrompt} 
        onClose={() => setShowInstallPrompt(false)} 
        canInstall={canInstall}
      />
    </section>
    {devOverlay}
  </>
  );
}
`;

// EnableNotifications — renderless component that registers the service worker.
const reactComponentContent = `"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "pwa-notifications/client";

export default function EnableNotifications() {
  useEffect(() => {
    registerServiceWorker("/sw.js")
      .then(() => console.log("Service Worker Registered!"))
      .catch(console.error);
  }, []);

  return null;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// FRAMEWORK / BUNDLER DETECTION
// Reads the host project's package.json to decide which templates to inject
// and how to reference env variables (NEXT_PUBLIC_ vs VITE_).
// ─────────────────────────────────────────────────────────────────────────────
let targetAppName = "App";
let framework = "react"; // Default fallback
let bundler = "webpack"; // Default fallback
let hasTypeScript = false;

try {
  const pkgContent = fs.readFileSync(path.join(initCwd, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgContent);
  if (pkg.name) {
    targetAppName = pkg.name;
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['next']) {
    framework = "next";
    bundler = "next";
  } else if (deps['vue']) {
    framework = "vue";
    bundler = deps['vite'] ? "vite" : "webpack";
  } else if (deps['react']) {
    framework = "react";
    bundler = deps['vite'] ? "vite" : "webpack";
  }
  hasTypeScript = fs.existsSync(path.join(initCwd, 'tsconfig.json')) || 
                  deps['typescript'] !== undefined || 
                  deps['@tsconfig/node'] !== undefined ||
                  deps['vue-tsc'] !== undefined;
} catch (e) {}

const isVue = framework === "vue";
const envPrefix = bundler === "vite" ? "VITE_" : "NEXT_PUBLIC_";
const componentExt = isVue ? ".vue" : (hasTypeScript ? ".tsx" : ".jsx");

function stripTypeScript(content, isVueFile) {
  let result = content;
  if (isVueFile) {
    result = result.replace(/<script setup lang="ts">/g, '<script setup>');
    result = result.replace(/const props = defineProps<\{[\s\S]*?\}\>\(\)/g, (match) => {
      if (match.includes('appName')) {
        return "const props = defineProps(['appName'])";
      }
      if (match.includes('isOpen')) {
        return "const props = defineProps(['isOpen', 'canInstall'])";
      }
      return "const props = defineProps([])";
    });
    result = result.replace(/const emit = defineEmits<[\s\S]*?>\(\)/g, "const emit = defineEmits(['close'])");
    result = result.replace(/ref<[\s\S]*?>\(([\s\S]*?)\)/g, 'ref($1)');
    result = result.replace(/let observer:\s*MutationObserver\s*\|\s*null\s*=\s*null/g, 'let observer = null');
    result = result.replace(/let cleanupInstallable:\s*\(\(\)\s*=>\s*void\)\s*\|\s*null\s*=\s*null/g, 'let cleanupInstallable = null');
    result = result.replace(/let timer:\s*ReturnType<typeof setTimeout>\s*\|\s*null\s*=\s*null/g, 'let timer = null');
    result = result.replace(/showToast\s*=\s*\(message:\s*string,\s*type:\s*['"a-zA-Z\s|]*\s*=\s*['"]success['"]\)/g, 'showToast = (message, type = "success")');
    result = result.replace(/as\s+BufferSource/g, '');
  } else {
    result = result.replace(/interface\s+\w+Props\s*\{[\s\S]*?\}/g, '');
    result = result.replace(/\:\s*\w+Props/g, '');
    result = result.replace(/const \[supported, setSupported\] = useState<boolean>\(false\)/g, 'const [supported, setSupported] = useState(false)');
    result = result.replace(/const \[isSubscribed, setIsSubscribed\] = useState<boolean>\(false\)/g, 'const [isSubscribed, setIsSubscribed] = useState(false)');
    result = result.replace(/const \[isLoading, setIsLoading\] = useState<boolean>\(false\)/g, 'const [isLoading, setIsLoading] = useState(false)');
    result = result.replace(/const \[toast, setToast\] = useState<\{[\s\S]*?\}\s*\|\s*null>\(null\)/g, 'const [toast, setToast] = useState(null)');
    result = result.replace(/const \[isDark, setIsDark\] = useState<boolean>\(false\)/g, 'const [isDark, setIsDark] = useState(false)');
    result = result.replace(/const \[canInstall, setCanInstall\] = useState<boolean>\(false\)/g, 'const [canInstall, setCanInstall] = useState(false)');
    result = result.replace(/const \[isIOS, setIsIOS\] = useState<boolean>\(false\)/g, 'const [isIOS, setIsIOS] = useState(false)');
    result = result.replace(/const \[isAndroid, setIsAndroid\] = useState<boolean>\(false\)/g, 'const [isAndroid, setIsAndroid] = useState(false)');
    result = result.replace(/const \[isDismissed, setIsDismissed\] = useState<boolean>\(false\)/g, 'const [isDismissed, setIsDismissed] = useState(false)');
    result = result.replace(/const \[isInstalled, setIsInstalled\] = useState<boolean \| null>\(null\)/g, 'const [isInstalled, setIsInstalled] = useState(null)');
    result = result.replace(/const \[appName, setAppName\] = useState<string>\(propAppName \|\| "Our App"\)/g, 'const [appName, setAppName] = useState(propAppName || "Our App")');
    result = result.replace(/const \[appDescription, setAppDescription\] = useState<string>\("Always Connected"\)/g, 'const [appDescription, setAppDescription] = useState("Always Connected")');
    result = result.replace(/const \[isSettingsOpen, setIsSettingsOpen\] = useState<boolean>\(false\)/g, 'const [isSettingsOpen, setIsSettingsOpen] = useState(false)');
    result = result.replace(/const \[showInstallPrompt, setShowInstallPrompt\] = useState<boolean>\(false\)/g, 'const [showInstallPrompt, setShowInstallPrompt] = useState(false)');
    result = result.replace(/const \[devWarnings, setDevWarnings\] = useState<string\[\]>\(\[\]\)/g, 'const [devWarnings, setDevWarnings] = useState([])');
    result = result.replace(/const warn = \(msg: string\)/g, 'const warn = (msg)');
    result = result.replace(/as\s+any/g, '');
    result = result.replace(/as\s+BufferSource/g, '');
  }
  return result;
}

const appFirstLetter = targetAppName.charAt(0).toUpperCase();
const appDisplayName = targetAppName
  .split(/[-_]+/)
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const manifestContent = `{
  "name": "${appDisplayName}",
  "short_name": "${appDisplayName}",
  "description": "Always Connected",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
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

// ─────────────────────────────────────────────────────────────────────────────
// VUE COMPONENT TEMPLATES
// Parallel Vue 3 (Composition API) equivalents of the React templates above.
// TypeScript is stripped for JS-only Vue projects via stripTypeScript().
// ─────────────────────────────────────────────────────────────────────────────

// EnableNotifications (Vue)
const vueEnableNotificationsContent = `<script setup lang="ts">
import { onMounted } from 'vue'
import { registerServiceWorker } from 'pwa-notifications/client'

onMounted(() => {
  registerServiceWorker('/sw.js')
    .then(() => console.log('Service Worker Registered!'))
    .catch(console.error)
})
</script>

<template>
  <!-- Renderless helper component -->
</template>
`;

// InstallPrompt (Vue)
const vueInstallPromptContent = `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { promptPWAInstall } from 'pwa-notifications/client'

const props = defineProps<{
  isOpen: boolean
  canInstall: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const isIOS = ref(false)
const isAndroid = ref(false)
const isDark = ref(false)

let observer: MutationObserver | null = null

const checkDark = () => {
  const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
  isDark.value = isDarkClass
}

onMounted(() => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  isIOS.value = /iphone|ipad|ipod/.test(userAgent)
  isAndroid.value = /android/.test(userAgent)

  checkDark()

  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

const handleInstall = async () => {
  const installed = await promptPWAInstall()
  if (installed) {
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    style="
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      padding: 1rem;
      font-family: system-ui, -apple-system, sans-serif;
    "
  >
    <div
      :style="{
        backgroundColor: isDark ? '#1e293b' : 'white',
        borderRadius: '1.25rem',
        width: '100%',
        maxWidth: '26rem',
        padding: '1.5rem',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: isDark ? '1px solid #334155' : '1px solid #f1f5f9'
      }"
    >
      <!-- Header -->
      <div style="margin-bottom: 1rem">
        <h3 :style="{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }">
          Install App
        </h3>
      </div>

      <!-- Body -->
      <div style="margin-bottom: 1.75rem">
        <p v-if="canInstall" :style="{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }">
          Would you like to install this application to your home screen? This gives you quick, one-tap access and supports offline capabilities.
        </p>

        <div v-else-if="isIOS" style="display: flex; flex-direction: column; gap: 0.75rem">
          <p :style="{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }">
            To add this app to your home screen:
          </p>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
            }"
          >
            <div
              :style="{
                width: '1.5rem',
                height: '1.5rem',
                backgroundColor: isDark ? '#38bdf8' : '#0f172a',
                color: isDark ? '#0f172a' : 'white',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }"
            >
              1
            </div>
            <span :style="{ fontSize: '0.8125rem', color: isDark ? '#e2e8f0' : '#334155' }">
              Tap the <strong>Share</strong> button (bottom or top right).
            </span>
          </div>
          <div
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
            }"
          >
            <div
              :style="{
                width: '1.5rem',
                height: '1.5rem',
                backgroundColor: isDark ? '#38bdf8' : '#0f172a',
                color: isDark ? '#0f172a' : 'white',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }"
            >
              2
            </div>
            <span :style="{ fontSize: '0.8125rem', color: isDark ? '#e2e8f0' : '#334155' }">
              Select <strong>Add to Home Screen</strong>.
            </span>
          </div>
        </div>

        <div v-else-if="isAndroid" style="display: flex; flex-direction: column; gap: 0.75rem">
          <p :style="{ color: isDark ? '#cbd5e1' : '#475569', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }">
            To add this app to your home screen:
          </p>
          <div
            :style="{
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              padding: '1rem',
              borderRadius: '0.75rem',
              fontSize: '0.8125rem',
              color: isDark ? '#e2e8f0' : '#334155',
              textAlign: 'center',
              border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
            }"
          >
            Tap the menu button (<strong>⋮</strong>) and select <br /><strong>Add to Home screen</strong>
          </div>
        </div>

        <p :style="{ color: isDark ? '#94a3b8' : '#64748b', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }">
          Installation is not supported on this browser. Please open this app in Chrome, Safari, or Edge to install.
        </p>
      </div>

      <!-- Footer Buttons -->
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem">
        <button
          @click="emit('close')"
          style="
            padding: 0.5rem 1rem;
            background-color: transparent;
            color: #ef4444;
            border-radius: 0.75rem;
            border: none;
            font-weight: 500;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background-color 0.2s;
            outline: none;
          "
          :style="{
            color: isDark ? '#f87171' : '#ef4444'
          }"
        >
          Cancel
        </button>

        <button
          v-if="canInstall"
          @click="handleInstall"
          :style="{
            padding: '0.5rem 1.25rem',
            backgroundColor: isDark ? '#006fee' : '#0f172a',
            color: 'white',
            borderRadius: '0.75rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            boxShadow: isDark ? '0 4px 6px -1px rgba(0, 111, 238, 0.2)' : '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
            transition: 'background-color 0.2s',
            outline: 'none'
          }"
        >
          Install
        </button>

        <button
          v-else
          @click="emit('close')"
          :style="{
            padding: '0.5rem 1.25rem',
            backgroundColor: isDark ? '#006fee' : '#0f172a',
            color: 'white',
            borderRadius: '0.75rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'background-color 0.2s',
            outline: 'none'
          }"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
</template>
`;

// PushNotificationManager (Vue)
const vuePushManagerContent = `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeToPush, isPushSupported } from 'pwa-notifications/client'

const supported = ref(false)
const isSubscribed = ref(false)
const isLoading = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
const isDark = ref(false)

let observer: MutationObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null

const checkDark = () => {
  const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
  isDark.value = isDarkClass
}

onMounted(() => {
  supported.value = isPushSupported()
  if (isPushSupported()) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        isSubscribed.value = !!sub
      })
    })
  }

  checkDark()

  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (timer) clearTimeout(timer)
})

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  toast.value = { message, type }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    toast.value = null
  }, 3000)
}

const handleSendTestNotification = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }
    const reg = await navigator.serviceWorker.ready
    if (!reg) {
      throw new Error('No active Service Worker found')
    }
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted. Please enable it in browser settings.')
    }
    await reg.showNotification('Test Notification', {
      body: 'This is a simulated push notification from your settings modal!',
      icon: '/icon-192x192.svg',
      data: { url: window.location.origin }
    })
    showToast('Test notification sent!', 'success')
  } catch (err: any) {
    console.error(err)
    showToast(err.message || 'Failed to trigger notification', 'error')
  }
}

const handleToggleSubscription = async () => {
  isLoading.value = true
  try {
    if (isSubscribed.value) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        isSubscribed.value = false
        showToast('Successfully unsubscribed from notifications.', 'info')
      }
    } else {
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY_HERE'
      const subscription = await subscribeToPush({ vapidKey })
      
      try {
        await fetch('/api/test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        })
      } catch (e) {
        console.warn('Backend API subscription save failed, but localized client registration succeeded:', e)
      }
      
      isSubscribed.value = true
      showToast('Successfully subscribed to notifications!', 'success')
    }
  } catch (error) {
    console.error(error)
    showToast('Failed to update subscription. Check permissions.', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="!supported" style="padding: 1rem; border-radius: 0.5rem; font-family: sans-serif;"
    :style="{
      backgroundColor: isDark ? '#27272a' : '#fef3c7',
      color: isDark ? '#f4f4f5' : '#92400e',
      border: isDark ? '1px solid #3f3f46' : 'none'
    }">
    Push notifications are not supported in this browser.
  </div>

  <div v-else style="position: relative;">
    <div style="padding: 1.5rem; border-radius: 0.75rem; font-family: sans-serif; max-width: 32rem; box-sizing: border-box;"
      :style="{
        backgroundColor: isDark ? '#1e293b' : 'white',
        border: isDark ? '1px solid #334155' : '1px solid #e5e7eb'
      }">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <p style="margin: 0 0 0.25rem 0; font-weight: 500;" :style="{ color: isDark ? '#f8fafc' : '#1f2937' }">Push Notifications</p>
          <p style="margin: 0; fontSize: 0.875rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">
            {{ isSubscribed ? "You are receiving updates and alerts." : "Get notified about new updates." }}
          </p>
        </div>
        
        <label style="position: relative; display: inline-flex; align-items: center; user-select: none;"
          :style="{ cursor: isLoading ? 'not-allowed' : 'pointer' }">
          <input 
            type="checkbox" 
            :checked="isSubscribed" 
            @change="handleToggleSubscription"
            :disabled="isLoading"
            style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"
          />
          <div style="width: 2.75rem; height: 1.5rem; border-radius: 9999px; position: relative; transition: background-color 0.2s;"
            :style="{
              backgroundColor: isSubscribed ? '#006fee' : isDark ? '#3f3f46' : '#e4e4e7',
              opacity: isLoading ? 0.7 : 1
            }">
            <div style="width: 1.125rem; height: 1.125rem; background-color: white; border-radius: 50%; position: absolute; top: 0.1875rem; transition: left 0.2s; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);"
              :style="{ left: isSubscribed ? '1.4375rem' : '0.1875rem' }" />
          </div>
        </label>
      </div>
      <div v-if="isSubscribed" style="margin-top: 1.25rem; border-top: 1px solid; padding-top: 1rem; display: flex; justify-content: flex-end;"
        :style="{ borderTopColor: isDark ? '#334155' : '#f1f5f9' }">
        <button
          @click="handleSendTestNotification"
          :disabled="isLoading"
          style="
            padding: 0.5rem 1rem;
            font-weight: 500;
            cursor: pointer;
            font-size: 0.8125rem;
            border-radius: 0.5rem;
            transition: all 0.2s;
            outline: none;
          "
          :style="{
            backgroundColor: isDark ? '#3f3f46' : '#f1f5f9',
            color: isDark ? '#f8fafc' : '#334155',
            border: isDark ? '1px solid #4b5563' : '1px solid #cbd5e1'
          }"
          @mouseenter="$event.currentTarget.style.backgroundColor = isDark ? '#52525b' : '#e2e8f0'"
          @mouseleave="$event.currentTarget.style.backgroundColor = isDark ? '#3f3f46' : '#f1f5f9'"
        >
          Send Test Notification
        </button>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" style="position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 300; border-radius: 0.75rem; padding: 1rem; display: flex; align-items: center; gap: 0.75rem; min-width: 18rem; max-width: 24rem; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box;"
      :style="{
        backgroundColor: isDark ? '#1e293b' : 'white',
        boxShadow: isDark ? '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderLeft: '4px solid ' + (toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'),
        borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
        borderRight: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
        borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
      }">
      <div style="display: flex; flex-shrink: 0;" :style="{ color: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6' }">
        <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      </div>
      <div style="flex: 1; fontSize: 0.875rem; fontWeight: 500;" :style="{ color: isDark ? '#f1f5f9' : '#334155' }">
        {{ toast.message }}
      </div>
      <button @click="toast = null" style="border: none; background: transparent; cursor: pointer; color: #94a3b8; fontSize: 1.25rem; padding: 0; outline: none;">
        &times;
      </button>
    </div>
  </div>
</template>
`;

// InstallSection (Vue)
const vueInstallSectionContent = `<script setup lang="ts">
import { onPWAInstallable, isPWAInstalled } from 'pwa-notifications/client'
import PushNotificationManager from './PushNotificationManager.vue'
import InstallPrompt from './InstallPrompt.vue'

const props = defineProps<{
  appName?: string
}>()

const canInstall = ref(false)
const isIOS = ref(false)
const isAndroid = ref(false)
const isDismissed = ref(false)
const isInstalled = ref<boolean | null>(null)
const appName = ref(props.appName || 'Our App')
const appDescription = ref('Always Connected')
const isDark = ref(false)
const isSettingsOpen = ref(false)
const showInstallPrompt = ref(false)

let cleanupInstallable: (() => void) | null = null
let observer: MutationObserver | null = null

const checkDark = () => {
  const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
  isDark.value = isDarkClass
}

onMounted(() => {
  isDismissed.value = localStorage.getItem('installSectionDismissed') === 'true'
  isInstalled.value = isPWAInstalled() ?? false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  isIOS.value = /iphone|ipad|ipod/.test(userAgent)
  isAndroid.value = /android/.test(userAgent)

  fetch('/manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return res.json()
    })
    .then((data) => {
      if (!props.appName && (data.short_name || data.name)) {
        appName.value = data.short_name || data.name
      }
      if (data.description) {
        appDescription.value = data.description
      }
      // Validate icons — missing or empty src will prevent PWA installability
      if (Array.isArray(data.icons)) {
        data.icons.forEach((icon) => {
          if (!icon.src) {
            console.warn(
              '[pwa-notifications] manifest.json has an icon with an empty or missing "src".\n' +
              'This will prevent the PWA from being installable on some browsers.\n' +
              'Icon entry: ' + JSON.stringify(icon)
            )
            return
          }
          // Verify the icon file actually exists
          fetch(icon.src, { method: 'HEAD' }).then((r) => {
            if (!r.ok) {
              console.warn(
                '[pwa-notifications] manifest.json icon not found: "' + icon.src + '" (HTTP ' + r.status + ').\n' +
                'Make sure the file exists in your public/ directory.'
              )
            }
          }).catch(() => {
            console.warn(
              '[pwa-notifications] Could not reach manifest icon: "' + icon.src + '".\n' +
              'Make sure the file exists in your public/ directory.'
            )
          })
        })
      }
    })
    .catch(() => {
      console.warn(
        '[pwa-notifications] Could not load /manifest.json.\n' +
        'Make sure the file exists in your public/ directory.\n' +
        'Falling back to default app name and description.'
      )
    })
  
  cleanupInstallable = onPWAInstallable((installable) => {
    canInstall.value = installable
  })

  checkDark()

  observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (cleanupInstallable) cleanupInstallable()
  if (observer) observer.disconnect()
})

const handleInstallClick = () => {
  showInstallPrompt.value = true
}

const handleDismiss = () => {
  isDismissed.value = true
  localStorage.setItem('installSectionDismissed', 'true')
}
</script>

<template>
  <div v-if="isInstalled !== null && !isDismissed">
    <section v-if="isInstalled"
      style="padding: 2rem 1.5rem; fontFamily: sans-serif; display: flex; justify-content: center;"
      :style="{ backgroundColor: isDark ? '#0f172a' : '#f3f4f6' }">
      <div style="width: 100%; max-width: 32rem;">
        <PushNotificationManager />
      </div>
    </section>

    <section v-else-if="canInstall || isIOS || isAndroid"
      style="padding: 4rem 1.5rem; fontFamily: sans-serif; transition: background-color 0.3s;"
      :style="{ backgroundColor: isDark ? '#0f172a' : '#f3f4f6' }">
    <div style="max-width: 64rem; margin: 0 auto; display: grid; gap: 3rem; gridTemplateColumns: repeat(auto-fit, minmax(300px, 1fr)); alignItems: center;">
      
      <div>
        <span style="display: inline-block; padding: 0.25rem 0.75rem; fontSize: 0.75rem; fontWeight: bold; textTransform: uppercase; letterSpacing: 0.1em; borderRadius: 9999px; marginBottom: 1rem;"
          :style="{
            backgroundColor: isDark ? '#0f172a' : '#e0f2fe',
            color: isDark ? '#38bdf8' : '#0284c7',
            border: isDark ? '1px solid #1e293b' : 'none'
          }">
          Add to Home Screen
        </span>
        <h2 style="fontSize: 2.5rem; fontWeight: bold; margin: 0 0 1rem 0; lineHeight: 1.2;"
          :style="{ color: isDark ? '#f8fafc' : '#111827' }">
          Add {{ appName }} <span :style="{ color: isDark ? '#4b5563' : '#9ca3af', display: 'block' }">to your home screen.</span>
        </h2>
        <p style="fontSize: 1.125rem; marginBottom: 2rem;"
          :style="{ color: isDark ? '#94a3b8' : '#4b5563' }">
          Open faster, receive timely updates, and keep your work moving from any device.
        </p>

        <div style="display: flex; flexDirection: column; gap: 1rem; marginBottom: 2.5rem;">
          <div v-for="benefit in ['Real-time alerts for updates', 'Fast mobile access', 'Available right from your home screen']"
            :key="benefit" style="display: flex; alignItems: center; gap: 0.75rem; fontWeight: 500;"
            :style="{ color: isDark ? '#cbd5e1' : '#374151' }">
            <span style="color: #10b981; display: flex; align-items: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </span>
            {{ benefit }}
          </div>
        </div>

        <div style="padding: 1.5rem; borderRadius: 1.5rem;"
          :style="{
            backgroundColor: isDark ? '#1e293b' : 'white',
            boxShadow: isDark ? '0 10px 15px -3px rgba(0, 0, 0, 0.4)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: isDark ? '1px solid #334155' : 'none'
          }">
          
          <div v-if="canInstall">
            <div style="display: flex; alignItems: center; gap: 1rem; marginBottom: 1.5rem;">
              <div style="padding: 0.75rem; borderRadius: 1rem;"
                :style="{
                  backgroundColor: isDark ? '#0f172a' : '#e0f2fe',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: isDark ? '1px solid #1e293b' : 'none'
                }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              </div>
              <div>
                <h3 style="margin: 0; fontWeight: bold;" :style="{ color: isDark ? '#f8fafc' : '#111827' }">Install on Your Device</h3>
                <p style="margin: 0; fontSize: 0.875rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Add to your home screen for faster access.</p>
              </div>
            </div>
            <div style="display: flex; gap: 1rem;">
              <button @click="handleInstallClick"
                :style="{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: isDark ? '#006fee' : '#111827',
                  color: 'white',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer'
                }">
                Install
              </button>
              <button @click="isSettingsOpen = true"
                :style="{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: isDark ? '#1e293b' : 'white',
                  color: isDark ? '#cbd5e1' : '#374151',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  border: isDark ? '1px solid #334155' : '1px solid #d1d5db',
                  cursor: 'pointer'
                }">
                Settings
              </button>
            </div>
          </div>

          <div v-else-if="isIOS">
            <div style="display: flex; alignItems: center; gap: 1rem; marginBottom: 1.5rem;">
              <div style="padding: 0.75rem; borderRadius: 1rem;"
                :style="{
                  backgroundColor: isDark ? '#0f172a' : '#e0f2fe',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: isDark ? '1px solid #1e293b' : 'none'
                }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              </div>
              <div>
                <h3 style="margin: 0; fontWeight: bold;" :style="{ color: isDark ? '#f8fafc' : '#111827' }">Install on iOS</h3>
                <p style="margin: 0; fontSize: 0.875rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Use Safari's share menu to add this app.</p>
              </div>
            </div>
            <div style="display: flex; flexDirection: column; gap: 1rem;">
              <div style="display: flex; alignItems: center; gap: 1rem; padding: 0.75rem; borderRadius: 1rem;"
                :style="{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', border: isDark ? '1px solid #1e293b' : 'none' }">
                <div :style="{ width: '2rem', height: '2rem', backgroundColor: isDark ? '#38bdf8' : '#111827', color: isDark ? '#0f172a' : 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }">1</div>
                <div>
                  <p style="margin: 0; fontWeight: 600;" :style="{ color: isDark ? '#f1f5f9' : '#000' }">Tap the Share button</p>
                  <p style="margin: 0; fontSize: 0.75rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Bottom center or top right</p>
                </div>
              </div>
              <div style="display: flex; alignItems: center; gap: 1rem; padding: 0.75rem; borderRadius: 1rem;"
                :style="{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', border: isDark ? '1px solid #1e293b' : 'none' }">
                <div :style="{ width: '2rem', height: '2rem', backgroundColor: isDark ? '#38bdf8' : '#111827', color: isDark ? '#0f172a' : 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }">2</div>
                <div>
                  <p style="margin: 0; fontWeight: 600;" :style="{ color: isDark ? '#f1f5f9' : '#000' }">Select Add to Home Screen</p>
                  <p style="margin: 0; fontSize: 0.75rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Scroll down and tap</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="isAndroid">
            <div style="display: flex; alignItems: center; gap: 1rem; marginBottom: 1.5rem;">
              <div style="padding: 0.75rem; borderRadius: 1rem;"
                :style="{
                  backgroundColor: isDark ? '#0f2f1d' : '#d1fae5',
                  color: isDark ? '#34d399' : '#059669',
                  border: isDark ? '1px solid #10b981' : 'none'
                }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              </div>
              <div>
                <h3 style="margin: 0; fontWeight: bold;" :style="{ color: isDark ? '#f8fafc' : '#111827' }">Install on Android</h3>
                <p style="margin: 0; fontSize: 0.875rem;" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Use your browser menu to install.</p>
              </div>
            </div>
            <div style="padding: 1rem; borderRadius: 1rem; fontSize: 0.875rem; textAlign: center;"
              :style="{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                color: isDark ? '#cbd5e1' : '#4b5563',
                border: isDark ? '1px solid #1e293b' : 'none'
              }">
              Tap the Chrome menu and select <strong>Add to Home screen</strong>
            </div>
          </div>

        </div>
      </div>

      <div style="display: flex; justifyContent: center; position: relative; width: 100%;">
        <!-- Backdrop Blur -->
        <div style="position: absolute; left: 2rem; right: 2rem; top: 2rem; bottom: 2rem; borderRadius: 44px; zIndex: 0; backdropFilter: blur(24px);"
          :style="{
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.6)',
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)',
            boxShadow: isDark ? '0 30px 120px rgba(0, 0, 0, 0.5)' : '0 30px 120px rgba(148, 163, 184, 0.16)'
          }" />

        <!-- Phone Mockup -->
        <div style="position: relative; width: 18rem; borderRadius: 3rem; backgroundColor: '#0f172a'; padding: 3px; boxShadow: 0 35px 110px rgba(15, 23, 42, 0.28); zIndex: 1;">
          <div style="width: 100%; height: 520px; borderRadius: 2.8rem; overflow: hidden; position: relative;"
            :style="{ backgroundColor: isDark ? '#0f172a' : 'white' }">
            
            <!-- Status Bar -->
            <div style="display: flex; height: 2.25rem; alignItems: center; justifyContent: space-between; paddingLeft: 1.5rem; paddingRight: 1.5rem; fontSize: 12px; fontWeight: 600; position: relative; zIndex: 10;"
              :style="{ color: isDark ? '#cbd5e1' : '#0f172a' }">
              <span>9:41</span>
              <div style="position: absolute; left: 50%; top: 0; height: 1.5rem; width: 7rem; transform: translateX(-50%); backgroundColor: #0f172a; borderBottomLeftRadius: 1rem; borderBottomRightRadius: 1rem;" />
              <div style="display: flex; alignItems: center; gap: 0.25rem;">
                <span style="display: block; height: 0.625rem; width: 1rem; borderRadius: 4px; position: relative;"
                  :style="{ border: '1px solid ' + (isDark ? '#cbd5e1' : '#0f172a') }">
                  <span style="display: block; position: absolute; top: 1px; bottom: 1px; left: 1px; right: 3px; borderRadius: 2px;"
                    :style="{ backgroundColor: isDark ? '#cbd5e1' : '#0f172a' }" />
                </span>
              </div>
            </div>

            <!-- App Info Header -->
            <div style="paddingLeft: 1.25rem; paddingRight: 1.25rem; paddingBottom: 1rem; paddingTop: 0.5rem; display: flex; alignItems: center; gap: 0.5rem;"
              :style="{ borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9' }">
              <div style="display: flex; height: 1.5rem; width: 1.5rem; alignItems: center; justifyContent: center; borderRadius: 9999px; fontSize: 9px; fontWeight: bold; fontFamily: monospace; flexShrink: 0;"
                :style="{
                  backgroundColor: isDark ? '#f8fafc' : '#0f172a',
                  color: isDark ? '#0f172a' : 'white'
                }">
                {{ appName.charAt(0).toLowerCase() }}
              </div>
              <div style="minWidth: 0; flex: 1;">
                <p style="margin: 0; fontSize: 0.875rem; fontWeight: 700; lineHeight: 1.2; display: flex; alignItems: center; gap: 2px;"
                  :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">
                  {{ appName }}
                </p>
                <p style="margin: 0; fontSize: 0.75rem; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;"
                  :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">
                  {{ appDescription }}
                </p>
              </div>
            </div>

            <!-- Content Area / Simulated notifications -->
            <div style="padding: 1rem; paddingBottom: 7.5rem; height: calc(100% - 6rem); boxSizing: border-box; overflow: hidden;"
              :style="{ backgroundColor: isDark ? '#0b0f19' : '#f8fafc' }">
              <div style="borderRadius: 24px; padding: 1rem;"
                :style="{
                  border: isDark ? '1px solid #1e293b' : '1px solid rgba(255, 255, 255, 0.8)',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  boxShadow: isDark ? '0 10px 30px rgba(0, 0, 0, 0.2)' : '0 10px 30px rgba(148, 163, 184, 0.08)'
                }">
                <p style="margin: 0; fontSize: 0.75rem; fontWeight: 600; textTransform: uppercase; letterSpacing: 0.05em;"
                  :style="{ color: isDark ? '#475569' : '#94a3b8' }">Today</p>
                <h3 style="margin: 0.25rem 0 1rem 0; fontSize: 1.125rem; fontWeight: 700; letterSpacing: -0.02em;"
                  :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">New Updates</h3>
                
                <div style="display: flex; flexDirection: column; gap: 0.75rem;">
                  <!-- Alert 1 -->
                  <div style="display: flex; alignItems: center; gap: 0.75rem; borderRadius: 1rem; padding: 0.75rem;"
                    :style="{
                      border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                      backgroundColor: isDark ? '#1e293b' : 'rgba(248, 250, 252, 0.8)'
                    }">
                    <div style="display: flex; height: 2.25rem; width: 2.25rem; flexShrink: 0; alignItems: center; justifyContent: center; borderRadius: 0.75rem; color: #10b981;"
                      :style="{ backgroundColor: isDark ? '#052e16' : '#ecfdf5' }">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    </div>
                    <div style="minWidth: 0; flex: 1;">
                      <p style="margin: 0; fontWeight: 600; fontSize: 0.8125rem; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;"
                        :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">5 New Matches</p>
                      <p style="margin: 0; fontSize: 0.75rem; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;"
                        :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">Jobs matching your profile</p>
                    </div>
                  </div>

                  <!-- Alert 2 -->
                  <div style="display: flex; alignItems: center; gap: 0.75rem; borderRadius: 1rem; padding: 0.75rem;"
                    :style="{
                      border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                      backgroundColor: isDark ? '#1e293b' : 'rgba(248, 250, 252, 0.8)'
                    }">
                    <div style="display: flex; height: 2.25rem; width: 2.25rem; flexShrink: 0; alignItems: center; justifyContent: center; borderRadius: 0.75rem; color: #a855f7;"
                      :style="{ backgroundColor: isDark ? '#3b0764' : '#f3e8ff' }">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <div style="minWidth: 0; flex: 1;">
                      <p style="margin: 0; fontWeight: 600; fontSize: 0.8125rem; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;"
                        :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">12 Alerts</p>
                      <p style="margin: 0; fontSize: 0.75rem; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap;"
                        :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">New job postings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab bar -->
            <div style="position: absolute; bottom: 1.75rem; left: 50%; width: 84%; transform: translateX(-50%); borderRadius: 20px; padding: 0.375rem; display: grid; gridTemplateColumns: repeat(4, 1fr); gap: 0.125rem; zIndex: 20;"
              :style="{
                border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                boxShadow: isDark ? '0 12px 35px rgba(0, 0, 0, 0.4)' : '0 12px 35px rgba(148, 163, 184, 0.2)'
              }">
              <div style="borderRadius: 12px; padding: 0.375rem 0.125rem; textAlign: center; color: #006fee;">
                <svg style="margin: 0 auto; display: block;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                <span style="marginTop: 3px; display: block; fontSize: 9px; fontWeight: 600;">Jobs</span>
              </div>
              <div style="borderRadius: 12px; padding: 0.375rem 0.125rem; textAlign: center;" :style="{ color: isDark ? '#475569' : '#94a3b8' }">
                <svg style="margin: 0 auto; display: block;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                <span style="marginTop: 3px; display: block; fontSize: 9px; fontWeight: 600;">Saved</span>
              </div>
              <div style="borderRadius: 12px; padding: 0.375rem 0.125rem; textAlign: center;" :style="{ color: isDark ? '#475569' : '#94a3b8' }">
                <svg style="margin: 0 auto; display: block;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span style="marginTop: 3px; display: block; fontSize: 9px; fontWeight: 600;">Alerts</span>
              </div>
              <div style="borderRadius: 12px; padding: 0.375rem 0.125rem; textAlign: center;" :style="{ color: isDark ? '#475569' : '#94a3b8' }">
                <svg style="margin: 0 auto; display: block;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span style="marginTop: 3px; display: block; fontSize: 9px; fontWeight: 600;">Profile</span>
              </div>
            </div>

            <!-- Home indicator -->
            <div style="position: absolute; bottom: 8px; left: 50%; height: 5px; width: 80px; transform: translateX(-50%); borderRadius: 9999px; zIndex: 20;"
              :style="{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }" />
          </div>
        </div>
      </div>

    </div>

    <!-- Settings Modal -->
    <div v-if="isSettingsOpen"
      style="position: fixed; inset: 0; zIndex: 200; display: flex; alignItems: center; justifyCenter: center; background-color: rgba(0, 0, 0, 0.5); backdropFilter: blur(8px); padding: 1rem; fontFamily: system-ui, -apple-system, sans-serif; justify-content: center;">
      <div style="borderRadius: 1.25rem; width: 100%; maxWidth: 30rem; padding: 1.5rem; position: relative; boxSizing: border-box;"
        :style="{
          backgroundColor: isDark ? '#1e293b' : 'white',
          boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: isDark ? '1px solid #334155' : '1px solid #f1f5f9'
        }">
        <!-- Modal Header -->
        <div style="marginBottom: 1.25rem;">
          <h3 style="fontSize: 1.25rem; fontWeight: 600; margin: 0;" :style="{ color: isDark ? '#f8fafc' : '#0f172a' }">
            Notification Settings
          </h3>
        </div>
        
        <!-- Modal Body -->
        <div style="marginBottom: 1.5rem;">
          <PushNotificationManager />
        </div>
        
        <!-- Modal Footer -->
        <div style="display: flex; justify-content: flex-end;">
          <button @click="isSettingsOpen = false" 
            :style="{
              padding: '0.5rem 1.25rem',
              backgroundColor: isDark ? '#006fee' : '#0f172a',
              color: 'white',
              borderRadius: '0.75rem',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s',
              outline: 'none'
            }">
            Close
          </button>
        </div>
      </div>
    </div>

    <InstallPrompt 
      :isOpen="showInstallPrompt" 
      @close="showInstallPrompt = false" 
      :canInstall="canInstall"
    />
  </section>
  </div>
</template>
`;

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <circle cx="96" cy="96" r="96" fill="#0f172a"/>
  <text x="96" y="118" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="64" fill="#ffffff" text-anchor="middle">${appFirstLetter}</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="256" fill="#0f172a"/>
  <text x="256" y="312" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="160" fill="#ffffff" text-anchor="middle">${appFirstLetter}</text>
</svg>`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes `content` to `filePath` only if the file doesn't already exist.
 * This makes the postinstall safe to re-run without overwriting customisations.
 */
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

/**
 * Injects the manifest <link>, beforeinstallprompt listener, and PWA component
 * imports into the Next.js root layout file (app/layout.tsx or src/app/layout.tsx).
 */
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
      
      // 1. Inject Manifest Link and Early event listener script
      const linkTag = `<link rel="manifest" href="/manifest.json" />`;
      const scriptTag = `<script dangerouslySetInnerHTML={{ __html: "window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.deferredPrompt = e; });" }} />`;
      if (!content.includes('rel="manifest"')) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `  ${linkTag}\n  ${scriptTag}\n</head>`);
          modified = true;
        } else if (content.match(/<html[^>]*>/i)) {
          content = content.replace(/(<html[^>]*>)/i, `$1\n        <head>\n          ${linkTag}\n          ${scriptTag}\n        </head>`);
          modified = true;
        }
      } else if (!content.includes('window.deferredPrompt = e')) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `  ${scriptTag}\n</head>`);
          modified = true;
        }
      }
      
      // 2. Inject Component Import
      const importPath = hasSrcDir ? "@/components/pwa-notifications/EnableNotifications" : "@/components/pwa-notifications/EnableNotifications";
      const relativeImport = hasSrcDir ? "../components/pwa-notifications/EnableNotifications" : "../components/pwa-notifications/EnableNotifications";
      const relativeInstallSection = hasSrcDir ? "../components/pwa-notifications/InstallSection" : "../components/pwa-notifications/InstallSection";
      
      const componentImport = `import EnableNotifications from "${relativeImport}";\nimport InstallSection from "${relativeInstallSection}";\n`;
      if (!content.includes('EnableNotifications')) {
        content = componentImport + content;
        
        // 3. Render Components inside <body>
        if (content.match(/<body[^>]*>/i)) {
          content = content.replace(/(<body[^>]*>)/i, `$1\n        <EnableNotifications />`);
          modified = true;
        }
      }
      
      if (!content.includes('<InstallSection />')) {
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

/**
 * Injects the manifest <link>, beforeinstallprompt listener, and PWA component
 * imports into a React + Vite project's index.html and App component.
 */
function injectReactVitePWA(initCwd, hasSrcDir, pwaComponentsDir) {
  // 1. Inject manifest link into index.html
  const indexHtmlPath = path.join(initCwd, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const linkTag = `<link rel="manifest" href="/manifest.json" />`;
    const scriptTag = `<script>window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.deferredPrompt = e; });</script>`;
    let htmlModified = false;
    if (!htmlContent.includes('rel="manifest"')) {
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `    ${linkTag}\n    ${scriptTag}\n  </head>`);
        htmlModified = true;
      }
    } else if (!htmlContent.includes('window.deferredPrompt = e')) {
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `    ${scriptTag}\n  </head>`);
        htmlModified = true;
      }
    }
    if (htmlModified) {
      fs.writeFileSync(indexHtmlPath, htmlContent);
      console.log(`✅ pwa-notifications: Injected manifest link and early listener into index.html`);
    }
  }

  // 2. Inject components into App component
  const possibleAppFiles = [
    path.join(initCwd, 'src', 'App.tsx'),
    path.join(initCwd, 'src', 'App.jsx'),
    path.join(initCwd, 'src', 'App.js'),
    path.join(initCwd, 'App.tsx'),
    path.join(initCwd, 'App.jsx'),
    path.join(initCwd, 'App.js')
  ];

  for (const appFile of possibleAppFiles) {
    if (fs.existsSync(appFile)) {
      let content = fs.readFileSync(appFile, 'utf8');
      let modified = false;

      // Calculate relative import path
      let relativeImportDir = path.relative(path.dirname(appFile), pwaComponentsDir).replace(/\\/g, '/');
      if (!relativeImportDir.startsWith('.') && !relativeImportDir.startsWith('/')) {
        relativeImportDir = './' + relativeImportDir;
      }

      const importEnableNotifications = `import EnableNotifications from '${relativeImportDir}/EnableNotifications';`;
      const importInstallSection = `import InstallSection from '${relativeImportDir}/InstallSection';`;

      // Inject imports if not present
      if (!content.includes('EnableNotifications')) {
        content = `${importEnableNotifications}\n${importInstallSection}\n` + content;
        modified = true;
      }

      // Inject EnableNotifications after return ( <tag> or return ( <>
      if (!content.includes('<EnableNotifications />') && !content.includes('<EnableNotifications/>')) {
        const returnRegex = /(return\s*\(\s*)(<[a-zA-Z0-9_$:.-]+[^>]*>|<>)/;
        if (returnRegex.test(content)) {
          content = content.replace(returnRegex, `$1$2\n      <EnableNotifications />`);
          modified = true;
        }
      }

      // Inject InstallSection before closing tag of return statement
      if (!content.includes('<InstallSection />') && !content.includes('<InstallSection/>')) {
        const closingRegex = /(<\/[a-zA-Z0-9_$:.-]*>)\s*\)\s*;?\s*(\r?\n)?\s*\}/;
        if (closingRegex.test(content)) {
          content = content.replace(closingRegex, `\n      <InstallSection />\n    $1\n  )\n}`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(appFile, content);
        console.log(`✅ pwa-notifications: Injected EnableNotifications and InstallSection into ${path.relative(initCwd, appFile)}`);
      }
      return;
    }
  }
}

/**
 * Generates a fresh VAPID key pair using web-push and appends them to
 * .env.local (or .env if .env.local doesn't exist). Skipped if keys already
 * exist to avoid invalidating existing push subscriptions.
 *
 * The public key is exposed to the client via NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * (or VITE_VAPID_PUBLIC_KEY for Vite projects). Keep the private key secret.
 */
function generateAndInjectVapidKeys(initCwd) {
  const envLocalPath = path.join(initCwd, '.env.local');
  const envPath = path.join(initCwd, '.env');
  
  const targetEnvFile = fs.existsSync(envPath) && !fs.existsSync(envLocalPath) ? envPath : envLocalPath;

  let envContent = '';
  if (fs.existsSync(targetEnvFile)) {
    envContent = fs.readFileSync(targetEnvFile, 'utf8');
  }

  const publicVapidKeyName = `${envPrefix}VAPID_PUBLIC_KEY`;
  if (envContent.includes(publicVapidKeyName) || envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY') || envContent.includes('VITE_VAPID_PUBLIC_KEY')) {
    console.log(`ℹ️ pwa-notifications: VAPID keys already exist in ${path.relative(initCwd, targetEnvFile)}, skipping generation.`);
    return;
  }

  try {
    const webpush = require('web-push');
    const vapidKeys = webpush.generateVAPIDKeys();
    
    const keysToAdd = `\n# Generated by pwa-notifications\n${publicVapidKeyName}="${vapidKeys.publicKey}"\nVAPID_PRIVATE_KEY="${vapidKeys.privateKey}"\n`;
    
    fs.appendFileSync(targetEnvFile, keysToAdd);
    console.log(`✅ pwa-notifications: Generated and injected VAPID keys into ${path.relative(initCwd, targetEnvFile)}`);
  } catch (error) {
    console.error("❌ pwa-notifications: Failed to generate VAPID keys. web-push module might not be available yet.", error);
  }
}

try {
  const publicDir = path.join(initCwd, 'public');
  
  const hasSrcDir = fs.existsSync(path.join(initCwd, 'src'));
  const baseComponentsDir = hasSrcDir 
    ? path.join(initCwd, 'src', 'components') 
    : path.join(initCwd, 'components');
    
  const pwaComponentsDir = path.join(baseComponentsDir, 'pwa-notifications');

  console.log(`🚀 pwa-notifications: Auto-injecting PWA files for ${framework} (${bundler})...`);
  writeIfNotExist(path.join(publicDir, 'sw.js'), swContent);
  writeIfNotExist(path.join(publicDir, 'manifest.json'), manifestContent);
  writeIfNotExist(path.join(publicDir, 'icon-192x192.svg'), svg192);
  writeIfNotExist(path.join(publicDir, 'icon-512x512.svg'), svg512);

  let enableNotifications = isVue ? vueEnableNotificationsContent : reactComponentContent;
  let installPrompt = isVue ? vueInstallPromptContent : installPromptContent;
  let pushManager = isVue ? vuePushManagerContent : pushManagerContent;
  let installSection = isVue ? vueInstallSectionContent : installSectionContent;

  if (bundler === "vite") {
    pushManager = pushManager.replace(/process\.env\.NEXT_PUBLIC_VAPID_PUBLIC_KEY/g, `import.meta.env.VITE_VAPID_PUBLIC_KEY`);
  } else {
    pushManager = pushManager.replace(/NEXT_PUBLIC_VAPID_PUBLIC_KEY/g, `${envPrefix}VAPID_PUBLIC_KEY`);
  }

  if (!hasTypeScript) {
    enableNotifications = stripTypeScript(enableNotifications, isVue);
    installPrompt = stripTypeScript(installPrompt, isVue);
    pushManager = stripTypeScript(pushManager, isVue);
    installSection = stripTypeScript(installSection, isVue);
  }

  writeIfNotExist(path.join(pwaComponentsDir, 'EnableNotifications' + componentExt), enableNotifications);
  writeIfNotExist(path.join(pwaComponentsDir, 'InstallPrompt' + componentExt), installPrompt);
  writeIfNotExist(path.join(pwaComponentsDir, 'PushNotificationManager' + componentExt), pushManager);
  writeIfNotExist(path.join(pwaComponentsDir, 'InstallSection' + componentExt), installSection);
  
  if (framework === "next") {
    injectManifestAndComponent(initCwd, hasSrcDir);
  } else if (framework === "react" && bundler === "vite") {
    injectReactVitePWA(initCwd, hasSrcDir, pwaComponentsDir);
  } else {
    console.log(`ℹ️ pwa-notifications: To complete PWA integration, import and add <EnableNotifications /> and <InstallSection /> inside your main layout/view.`);
  }
  
  generateAndInjectVapidKeys(initCwd);
  
  console.log("🎉 pwa-notifications: Injection complete!");
} catch (e) {
  console.error("❌ pwa-notifications: Error during postinstall injection:", e);
}

