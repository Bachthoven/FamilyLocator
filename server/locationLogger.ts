import { storage } from "./storage";
import { log } from "./vite";

interface UserLocationSession {
  userId: string;
  lastLogTime: Date;
  intervalId: NodeJS.Timeout;
}

class LocationLogger {
  private activeSessions = new Map<string, UserLocationSession>();
  private readonly HOUR_IN_MS = 60 * 60 * 1000; // 1 hour

  startHourlyLogging(userId: string) {
    // Don't start if already active
    if (this.activeSessions.has(userId)) {
      return;
    }

    log(`Starting hourly location logging for user ${userId}`);

    const intervalId = setInterval(async () => {
      try {
        await this.logUserLocation(userId);
      } catch (error) {
        log(`Error logging location for user ${userId}: ${error}`);
      }
    }, this.HOUR_IN_MS);

    this.activeSessions.set(userId, {
      userId,
      lastLogTime: new Date(),
      intervalId,
    });
  }

  stopHourlyLogging(userId: string) {
    const session = this.activeSessions.get(userId);
    if (session) {
      clearInterval(session.intervalId);
      this.activeSessions.delete(userId);
      log(`Stopped hourly location logging for user ${userId}`);
    }
  }

  private async logUserLocation(userId: string) {
    try {
      // Get user's current settings
      const user = await storage.getUser(userId);
      if (!user || !user.locationHistoryEnabled) {
        log(`Skipping automatic location log for user ${userId} - history disabled`);
        return;
      }

      // Get the user's latest location
      const latestLocation = await storage.getUserLatestLocation(userId);
      if (!latestLocation) {
        log(`No location data available for user ${userId}`);
        return;
      }

      // Check if the latest location is recent (within the last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * this.HOUR_IN_MS);
      if (latestLocation.timestamp < twoHoursAgo) {
        log(`Latest location for user ${userId} is too old, skipping automatic log`);
        return;
      }

      // Create an automatic hourly log entry
      await storage.saveLocation({
        userId,
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        accuracy: latestLocation.accuracy,
        address: latestLocation.address,
        type: "automatic_hourly",
      });

      log(`Automatic hourly location logged for user ${userId}`);
    } catch (error) {
      log(`Failed to log automatic location for user ${userId}: ${error}`);
    }
  }

  // Get all active logging sessions (for debugging)
  getActiveSessions() {
    return Array.from(this.activeSessions.values()).map(session => ({
      userId: session.userId,
      lastLogTime: session.lastLogTime,
      nextLogTime: new Date(session.lastLogTime.getTime() + this.HOUR_IN_MS),
    }));
  }

  // Cleanup all sessions (for server shutdown)
  cleanup() {
    for (const session of this.activeSessions.values()) {
      clearInterval(session.intervalId);
    }
    this.activeSessions.clear();
    log("Location logger cleanup completed");
  }
}

export const locationLogger = new LocationLogger();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  locationLogger.cleanup();
});

process.on('SIGINT', () => {
  locationLogger.cleanup();
});