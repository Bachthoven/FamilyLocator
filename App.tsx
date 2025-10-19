import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import Constants from 'expo-constants';

// Get the API URL from Expo configuration
const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000';

export default function App() {
  useEffect(() => {
    // Test connection to backend
    fetch(`${API_URL}/api/health`)
      .then(res => res.json())
      .then(data => console.log('Backend connected:', data))
      .catch(err => console.log('Backend connection error:', err));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>FamilyLocator</Text>
        <Text style={styles.subtitle}>React Native + Expo</Text>
        <Text style={styles.info}>Backend: {API_URL}</Text>
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
});