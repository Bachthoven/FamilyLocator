import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertTriangle, XCircle, Info, MapPin, Users, Shield } from "lucide-react"

const getToastIcon = (title?: React.ReactNode, variant?: string) => {
  const titleStr = typeof title === 'string' ? title.toLowerCase() : '';
  
  // Geofence notifications
  if (titleStr.includes('entering') || titleStr.includes('entering')) {
    return <MapPin className="w-5 h-5 text-green-500" />;
  }
  if (titleStr.includes('exiting') || titleStr.includes('leaving')) {
    return <MapPin className="w-5 h-5 text-orange-500" />;
  }
  
  // Success notifications
  if (variant !== 'destructive' && (
    titleStr.includes('success') || 
    titleStr.includes('saved') || 
    titleStr.includes('added') || 
    titleStr.includes('copied') || 
    titleStr.includes('joined') ||
    titleStr.includes('started') ||
    titleStr.includes('stopped') ||
    titleStr.includes('deleted') ||
    titleStr.includes('removed') ||
    titleStr.includes('updated') ||
    titleStr.includes('centered')
  )) {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  
  // Family/location notifications
  if (titleStr.includes('location') || titleStr.includes('family') || titleStr.includes('member')) {
    return <Users className="w-5 h-5 text-blue-500" />;
  }
  
  // Error notifications
  if (variant === 'destructive' || titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('unauthorized')) {
    return <XCircle className="w-5 h-5 text-red-500" />;
  }
  
  // Warning notifications
  if (titleStr.includes('warning') || titleStr.includes('expired')) {
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }
  
  // Default info icon
  return <Info className="w-5 h-5 text-blue-500" />;
};

const getToastColors = (title?: React.ReactNode, variant?: string) => {
  const titleStr = typeof title === 'string' ? title.toLowerCase() : '';
  
  // Geofence notifications - special styling
  if (titleStr.includes('entering') || titleStr.includes('exiting')) {
    return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20';
  }
  
  // Success notifications
  if (variant !== 'destructive' && (
    titleStr.includes('success') || 
    titleStr.includes('saved') || 
    titleStr.includes('added') || 
    titleStr.includes('copied') || 
    titleStr.includes('joined') ||
    titleStr.includes('started') ||
    titleStr.includes('stopped') ||
    titleStr.includes('deleted') ||
    titleStr.includes('removed') ||
    titleStr.includes('updated') ||
    titleStr.includes('centered')
  )) {
    return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20';
  }
  
  // Family/location notifications
  if (titleStr.includes('location') || titleStr.includes('family') || titleStr.includes('member')) {
    return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
  }
  
  // Error notifications
  if (variant === 'destructive' || titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('unauthorized')) {
    return 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20';
  }
  
  // Warning notifications
  if (titleStr.includes('warning') || titleStr.includes('expired')) {
    return 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
  }
  
  // Default
  return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
};

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = getToastIcon(title, variant);
        const colors = getToastColors(title, variant);
        
        return (
          <Toast key={id} {...props} className={`${colors} shadow-lg`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {icon}
              </div>
              <div className="grid gap-1 flex-1 min-w-0">
                {title && (
                  <ToastTitle className="font-bold text-base leading-tight">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-sm font-medium leading-relaxed">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
