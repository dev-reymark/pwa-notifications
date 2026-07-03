import webpush from "web-push";

export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: any;
}

export interface WebPushError extends Error {
  statusCode?: number;
}

/**
 * Configure VAPID details for web-push
 */
export function configureWebPush(details: VapidDetails) {
  webpush.setVapidDetails(details.subject, details.publicKey, details.privateKey);
}

/**
 * Send a push notification to a specific subscription
 * @param subscription The push subscription object
 * @param payload The payload to send
 * @returns A promise that resolves if successful
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<void> {
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon-512x512.png",
    data: { url: payload.url, ...payload.data },
  });

  try {
    await webpush.sendNotification(subscription, data);
  } catch (error) {
    throw error;
  }
}
