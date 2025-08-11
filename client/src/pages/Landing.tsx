import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Shield, ArrowRight, CheckCircle, UserPlus, Heart, Smartphone } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent leading-tight py-2">
              FamilyLocator
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Stay connected with your loved ones. Share your location securely and keep your family safe with real-time location tracking.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'} 
              className="text-lg px-8 py-4 h-auto"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create Your Free Account
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = '/api/login'} 
              className="text-lg px-8 py-4 h-auto"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Sign In
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            <p className="mb-2">✓ No credit card required</p>
            <p className="mb-2">✓ Set up in under 30 seconds</p>
            <p>✓ Uses secure Replit authentication</p>
          </div>
          

        </div>

        {/* How it Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How to Get Your Family Connected</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="text-center p-6 relative">
              <CardContent className="pt-6">
                <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Sign Up or Sign In</h3>
                <p className="text-muted-foreground mb-4">
                  Click either button above - if you're new, you'll create an account; if you already have one, you'll sign right in. Takes seconds with secure Replit authentication.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm">
                  <strong>That's it!</strong> New or returning, you're instantly ready to use the app.
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 relative">
              <CardContent className="pt-6">
                <div className="bg-red-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Share with Family</h3>
                <p className="text-muted-foreground mb-4">
                  Send this website link to your family members so they can create their own accounts the same way you did.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                  <strong>Copy this link:</strong><br />
                  <code className="text-xs break-all">{window.location.origin}</code>
                </div>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 relative">
              <CardContent className="pt-6">
                <div className="bg-green-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Connect & Share</h3>
                <p className="text-muted-foreground mb-4">
                  Once everyone has accounts, invite each other through the Family tab and start sharing locations safely.
                </p>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-sm">
                  <strong>Important:</strong> Everyone needs their own account before you can invite them.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Families Love FamilyLocator</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Real-time Location Sharing</h3>
                <p className="text-muted-foreground">See where your family members are right now with live location updates on an interactive map.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Privacy Controls</h3>
                <p className="text-muted-foreground">Complete control over when and with whom you share your location. Your privacy, your choice.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Family Groups</h3>
                <p className="text-muted-foreground">Easily manage your family connections and see everyone's status in one place.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                <Smartphone className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Works Everywhere</h3>
                <p className="text-muted-foreground">Access from any device with a web browser. No app downloads required.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl p-8 max-w-2xl mx-auto border">
            <h2 className="text-2xl font-bold mb-4">
              Ready to Keep Your Family Connected?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join families worldwide who trust FamilyLocator for safe, secure location sharing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                className="text-lg px-6 py-3 h-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                className="text-lg px-6 py-3 h-auto"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              By creating an account, you agree to keep your family's location data private and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}