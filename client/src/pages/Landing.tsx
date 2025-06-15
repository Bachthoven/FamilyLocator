import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, Shield, Bell } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: MapPin,
      title: 'Real-time Location Sharing',
      description: 'Share your location with family members in real-time and see where everyone is.',
    },
    {
      icon: Users,
      title: 'Family Groups',
      description: 'Create and manage family groups to stay connected with the people that matter most.',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Complete control over your location sharing with granular privacy settings.',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get notified when family members arrive at important places or share updates.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              FamilyLocator
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Stay connected with your family through safe, private location sharing. 
              Know where your loved ones are and feel secure wherever you go.
            </p>
          </div>
          
          <Button 
            size="lg" 
            className="px-8 py-3 text-lg font-semibold"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to stay connected?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join thousands of families who trust FamilyLocator to keep their loved ones safe and connected.
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
            >
              Start for Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
