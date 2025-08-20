import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertCircle, Info, CheckCircle, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TestNotifications() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const runDiagnostics = () => {
    setTestResults([]);
    
    // Check basic support
    if (!('Notification' in window)) {
      addResult("❌ Notifications NOT supported by this browser");
      return;
    }
    addResult("✅ Notification API is supported");
    
    // Check permission
    addResult(`📋 Permission status: ${Notification.permission}`);
    
    // Check visibility state
    addResult(`👁 Page visibility: ${document.visibilityState}`);
    addResult(`🎯 Page has focus: ${document.hasFocus()}`);
    
    // Check browser/system info
    addResult(`🌐 Browser: ${navigator.userAgent.substring(0, 50)}...`);
    
    // Try to detect if page needs to be in background
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      addResult("⚠️ NOTE: Some browsers only show notifications when the page is in the background!");
      addResult("💡 TIP: Try switching to another tab/window after clicking test");
    }
  };

  const testWithDelay = () => {
    addResult("⏱ Will send notification in 3 seconds - SWITCH TO ANOTHER TAB NOW!");
    
    toast({
      title: "Quick! Switch tabs!",
      description: "Switch to another tab or minimize the browser within 3 seconds",
      duration: 3000,
    });
    
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification("🎉 Delayed Test Notification", {
            body: `Sent at ${new Date().toLocaleTimeString()}. If you see this, notifications work when page is in background!`,
            icon: '/favicon.ico',
            tag: 'delayed-test',
            requireInteraction: true, // Keep it open until user interacts
          });
          
          addResult("✅ Delayed notification created");
          
          notification.onclick = () => {
            addResult("🖱 Notification was clicked!");
          };
        } catch (error) {
          addResult(`❌ Error: ${(error as Error).message}`);
        }
      }
    }, 3000);
  };

  const testServiceWorkerNotification = async () => {
    if (!('serviceWorker' in navigator)) {
      addResult("❌ Service Worker not supported");
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      addResult("✅ Service Worker ready");
      
      if ('showNotification' in registration) {
        await registration.showNotification("🔔 Service Worker Notification", {
          body: "This uses Service Worker API instead of Notification API",
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'sw-test',
          requireInteraction: true,
        });
        addResult("✅ Service Worker notification sent");
      } else {
        addResult("❌ showNotification not available");
      }
    } catch (error) {
      addResult(`❌ Service Worker error: ${(error as Error).message}`);
    }
  };

  const testMultipleApproaches = async () => {
    addResult("🧪 Testing multiple notification methods...");
    
    // Method 1: Standard API
    try {
      new Notification("Method 1: Standard", {
        body: "Basic Notification API",
        tag: 'method1',
      });
      addResult("✅ Method 1: Standard API worked");
    } catch (e) {
      addResult(`❌ Method 1 failed: ${(e as Error).message}`);
    }
    
    // Method 2: With all options
    try {
      new Notification("Method 2: Full Options", {
        body: "With all possible options",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'method2',
        renotify: true,
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        data: { test: true },
      });
      addResult("✅ Method 2: Full options worked");
    } catch (e) {
      addResult(`❌ Method 2 failed: ${(e as Error).message}`);
    }
    
    // Method 3: Minimal
    try {
      new Notification("Method 3");
      addResult("✅ Method 3: Minimal worked");
    } catch (e) {
      addResult(`❌ Method 3 failed: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Notification Diagnostics
        </CardTitle>
        <CardDescription>
          Debug why notifications might not be appearing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Common Issues:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>System Do Not Disturb or Focus Assist is ON</li>
                <li>Browser notifications blocked in system settings</li>
                <li>Page must be in background (minimized/different tab)</li>
                <li>Browser notifications muted for this site</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Button onClick={runDiagnostics} variant="outline" className="w-full">
            <AlertCircle className="w-4 h-4 mr-2" />
            Run Diagnostics
          </Button>
          
          <Button onClick={testWithDelay} variant="outline" className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            Test with 3s Delay (Switch Tabs!)
          </Button>
          
          <Button onClick={testMultipleApproaches} variant="outline" className="w-full">
            <TestTube className="w-4 h-4 mr-2" />
            Test Multiple Methods
          </Button>
          
          <Button onClick={testServiceWorkerNotification} variant="outline" className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            Test Service Worker Method
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="font-medium text-sm mb-2">Test Results:</p>
            <div className="space-y-1 font-mono text-xs">
              {testResults.map((result, i) => (
                <div key={i} className="text-gray-700 dark:text-gray-300">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• On Windows: Check Focus Assist and notification settings</p>
          <p>• On macOS: Check System Preferences → Notifications → Chrome/Browser</p>
          <p>• On mobile: Check browser app notification permissions</p>
        </div>
      </CardContent>
    </Card>
  );
}