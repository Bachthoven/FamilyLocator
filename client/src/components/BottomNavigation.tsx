import { Link, useLocation } from 'wouter';
import { Map, Users, Bookmark, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    path: '/home',
    icon: Map,
    label: 'Map',
  },
  {
    path: '/family',
    icon: Users,
    label: 'Family',
  },
  {
    path: '/places',
    icon: Bookmark,
    label: 'Places',
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
      <div className="px-4 py-2 pb-safe-area-inset-bottom">
        <div className="flex justify-around items-center max-w-screen-sm mx-auto h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center py-2 px-1 transition-colors cursor-pointer rounded-lg h-full justify-center",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
