import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import MapScreen from './mobile/screens/MapScreen';
import FamilyScreen from './mobile/screens/FamilyScreen';
import PlacesScreen from './mobile/screens/PlacesScreen';
import HistoryScreen from './mobile/screens/HistoryScreen';
import SettingsScreen from './mobile/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Map" 
          component={MapScreen}
        />
        <Tab.Screen 
          name="Family" 
          component={FamilyScreen}
        />
        <Tab.Screen 
          name="Places" 
          component={PlacesScreen}
        />
        <Tab.Screen 
          name="History" 
          component={HistoryScreen}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
        />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
