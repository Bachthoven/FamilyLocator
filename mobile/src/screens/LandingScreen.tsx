import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function LandingScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.title}>FamilyLocator</Text>
          <Text style={styles.subtitle}>
            Stay connected with your loved ones. Share your location securely and keep{'\n'}
            your family safe with real-time location tracking.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => navigation.navigate('Auth' as never)}
          >
            <Ionicons name="sparkles" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.createAccountText}>Create Your Free Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Auth' as never)}
          >
            <Ionicons name="arrow-forward" size={16} color="#6B7280" style={styles.buttonIcon} />
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={14} color="#10B981" />
            <Text style={styles.featureText}>No credit card required</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={14} color="#10B981" />
            <Text style={styles.featureText}>Set up in under 30 seconds</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark" size={14} color="#10B981" />
            <Text style={styles.featureText}>Uses secure email authentication</Text>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How to Get Your Family Connected</Text>

          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name="person-add" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.stepTitle}>1. Sign Up or Sign In</Text>
              <Text style={styles.stepDescription}>
                Click either button above - if you're new, you'll create an account. If you already have one, you'll sign in. Takes seconds with secure email authentication.
              </Text>
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>That's it! New or returning, you're instantly ready to use the app.</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name="heart" size={24} color="#EF4444" />
              </View>
              <Text style={styles.stepTitle}>2. Share with Family</Text>
              <Text style={styles.stepDescription}>
                Send this website link to your family members so they can create their accounts the same way you did.
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name="location" size={24} color="#10B981" />
              </View>
              <Text style={styles.stepTitle}>3. Connect & Share</Text>
              <Text style={styles.stepDescription}>
                Once everyone has accounts, invite each other through the Family tab and start sharing locations safely.
              </Text>
              <View style={styles.importantNote}>
                <Text style={styles.importantLabel}>Important: </Text>
                <Text style={styles.importantText}>Everyone needs their own account before you can invite them.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Why Families Love Section */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>Why Families Love FamilyLocator</Text>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Real-time Location Sharing</Text>
                <Text style={styles.benefitDescription}>
                  See where your family members are right now with live location updates on an interactive map.
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name="people" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Family Groups</Text>
                <Text style={styles.benefitDescription}>
                  Easily manage your family connections and see everyone's status in one place.
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name="phone-portrait" size={20} color="#F59E0B" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Works Everywhere</Text>
                <Text style={styles.benefitDescription}>
                  Access from any device with a web browser. No app downloads required.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <Text style={styles.ctaTitle}>Ready to Keep Your Family Connected?</Text>
          <Text style={styles.ctaSubtitle}>
            Join families worldwide who trust FamilyLocator for safe, secure location sharing.
          </Text>

          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => navigation.navigate('Auth' as never)}
            >
              <Ionicons name="sparkles" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.createAccountText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate('Auth' as never)}
            >
              <Ionicons name="arrow-forward" size={16} color="#6B7280" style={styles.buttonIcon} />
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            By creating an account, you agree to keep your family's location data private and secure.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    gap: 8,
  },
  createAccountText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 6,
    gap: 8,
  },
  signInText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 4,
  },
  featuresList: {
    paddingHorizontal: 24,
    marginBottom: 60,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
  },
  howItWorksSection: {
    paddingHorizontal: 24,
    marginBottom: 60,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 40,
  },
  stepsContainer: {
    gap: 32,
  },
  step: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  readyBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  readyBadgeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
    textAlign: 'center',
  },
  importantNote: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  importantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  importantText: {
    fontSize: 12,
    color: '#6B7280',
  },
  whySection: {
    paddingHorizontal: 24,
    marginBottom: 60,
  },
  benefitsContainer: {
    gap: 24,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  benefitIcon: {
    marginTop: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bottomCTA: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    borderRadius: 8,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  bottomButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});