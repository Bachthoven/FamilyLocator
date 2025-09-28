import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useLocationService } from '../hooks/useLocationService';

interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  latitude?: number;
  longitude?: number;
  lastUpdated?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const {
    currentLocation,
    isLocationEnabled,
    requestLocationPermissions,
    startLocationTracking,
    stopLocationTracking
  } = useLocationService();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [onlineMemberCount] = useState(2); // Mock data to match screenshot
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    initializeLocation();
    loadFamilyMembers();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      setMapRegion(prev => ({
        ...prev,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }));
    }
  }, [currentLocation]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await requestLocationPermissions();
      if (hasPermission) {
        await startLocationTracking();
      }
    } catch (error) {
      console.error('Location initialization error:', error);
    }
  };

  const loadFamilyMembers = async () => {
    // Mock data to match the screenshot
    setFamilyMembers([
      {
        id: 1,
        firstName: 'Qing',
        lastName: 'Chang',
        latitude: 37.78925,
        longitude: -122.4334,
        lastUpdated: 'now'
      },
      {
        id: 2,
        firstName: 'Jing',
        lastName: 'Li',
        latitude: 37.78725,
        longitude: -122.4314,
        lastUpdated: 'now'
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Status Bar with Online Members */}
      <View style={styles.statusBar}>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{onlineMemberCount} members online</Text>
        </View>

        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#FFFFFF" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>99</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Full Screen Map */}
      <MapView
        style={styles.map}
        region={mapRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onRegionChangeComplete={setMapRegion}
      >
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
            description="Current location"
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}

        {familyMembers.map((member) => (
          member.latitude && member.longitude && (
            <Marker
              key={member.id}
              coordinate={{
                latitude: member.latitude,
                longitude: member.longitude,
              }}
              title={`${member.firstName} ${member.lastName}`}
              description={member.lastUpdated ? `Last updated: ${member.lastUpdated}` : ''}
            >
              <View style={styles.familyMarker}>
                <View style={styles.familyMarkerInner}>
                  <Text style={styles.familyMarkerText}>
                    {member.firstName[0]}
                  </Text>
                </View>
              </View>
            </Marker>
          )
        ))}

        {/* Location Markers from Screenshot */}
        <Marker coordinate={{ latitude: 37.7899, longitude: -122.4194 }} title="Costco Wholesale" />
        <Marker coordinate={{ latitude: 37.7849, longitude: -122.4094 }} title="In-N-Out Burger" />
        <Marker coordinate={{ latitude: 37.7809, longitude: -122.4160 }} title="Burger King" />
        <Marker coordinate={{ latitude: 37.7939, longitude: -122.4319 }} title="Love is Timeless" />
        <Marker coordinate={{ latitude: 37.7869, longitude: -122.4269 }} title="Real Flowers Every Day Danville" />
      </MapView>

      {/* Map Controls */}
      <TouchableOpacity style={styles.myLocationButton} onPress={() => {
        if (currentLocation) {
          setMapRegion({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }}>
        <Ionicons name="locate" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.zoomInButton}>
        <Ionicons name="add" size={24} color="#374151" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.zoomOutButton}>
        <Ionicons name="remove" size={24} color="#374151" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.layersButton}>
        <Ionicons name="layers" size={24} color="#374151" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.warningButton}>
        <Ionicons name="warning" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  notificationButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  familyMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyMarkerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyMarkerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomInButton: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomOutButton: {
    position: 'absolute',
    bottom: 240,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  layersButton: {
    position: 'absolute',
    bottom: 120,
    right: 80,
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningButton: {
    position: 'absolute',
    bottom: 200,
    right: 80,
    width: 44,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});