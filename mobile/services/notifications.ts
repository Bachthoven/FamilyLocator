const API_URL = "https://app.nativenotify.com/api";

// Native Notify credentials (from docs: https://app.nativenotify.com/in-app)
const NATIVE_NOTIFY_APP_ID = 32894;
const NATIVE_NOTIFY_APP_TOKEN = "kmj1gPUDYhaAKAZm1ep1vV";

interface MassNotificationParams {
  appId?: number;
  appToken?: string;
  title: string;
  body: string;
  dateSent?: string;
}

interface IndieNotificationParams {
  appId?: number;
  appToken?: string;
  subID: string;
  title: string;
  message: string;
  pushData?: string;
}

export async function sendMassNotification(
  params: MassNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: params.appId || NATIVE_NOTIFY_APP_ID,
        appToken: params.appToken || NATIVE_NOTIFY_APP_TOKEN,
        title: params.title,
        body: params.body,
        dateSent: params.dateSent || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        "Failed to send mass notification:",
        response.status,
        errorText
      );
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("Error sending mass notification:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function sendIndieNotification(
  params: IndieNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/indie/notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subID: params.subID,
        appId: params.appId || NATIVE_NOTIFY_APP_ID,
        appToken: params.appToken || NATIVE_NOTIFY_APP_TOKEN,
        title: params.title,
        message: params.message,
        pushData: params.pushData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        "Failed to send indie notification:",
        response.status,
        errorText
      );
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.log("Error sending indie notification:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export function createProximityNotificationPayload(
  memberName: string,
  placeName: string
): { title: string; message: string; pushData: string } {
  return {
    title: `${memberName} arrived`,
    message: `${memberName} is now at ${placeName}`,
    pushData: JSON.stringify({
      type: "proximity_alert",
      timestamp: new Date().toISOString(),
    }),
  };
}

export async function registerIndieUser(
  subID: string,
  appId?: number,
  appToken?: string
): Promise<void> {
  const { registerIndieID } = await import("native-notify");
  registerIndieID(
    subID,
    appId || NATIVE_NOTIFY_APP_ID,
    appToken || NATIVE_NOTIFY_APP_TOKEN
  );
}

export async function unregisterIndieUser(
  subID: string,
  appId?: number,
  appToken?: string
): Promise<void> {
  const { unregisterIndieDevice } = await import("native-notify");
  unregisterIndieDevice(
    subID,
    appId || NATIVE_NOTIFY_APP_ID,
    appToken || NATIVE_NOTIFY_APP_TOKEN
  );
}

// Export credentials for use elsewhere
export { NATIVE_NOTIFY_APP_ID, NATIVE_NOTIFY_APP_TOKEN };
