import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>⚙️</Text>
          <Text style={styles.title}>App Settings</Text>
          <Text style={styles.description}>
            Manage your profile, privacy settings, and location preferences
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
