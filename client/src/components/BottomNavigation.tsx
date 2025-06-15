import { Link, useLocation } from 'wouter';
import { Map, Users, Bookmark, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    path: '/',
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
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div className="bg-background border-t border-border px-4 py-2 safe-area-bottom">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <a className={cn(
                  "flex flex-col items-center py-2 px-3 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
