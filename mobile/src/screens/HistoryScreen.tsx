import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationHistory {
  id: number;
  address: string;
  timestamp: string;
  type: 'manual' | 'automatic';
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<LocationHistory[]>([]);

  const renderHistoryItem = ({ item }: { item: LocationHistory }) => (
    <View style={styles.historyItem}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={item.type === 'manual' ? 'location' : 'location-outline'}
          size={20}
          color="#299AE8"
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyAddress}>{item.address}</Text>
        <Text style={styles.historyTime}>{item.timestamp}</Text>
      </View>
      <Text style={styles.historyType}>
        {item.type === 'manual' ? 'Manual' : 'Auto'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location History</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No location history</Text>
          <Text style={styles.emptyStateSubText}>
            Your location history will appear here once you start sharing
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
  },
  historyType: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});