import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: 'accepted' | 'pending' | 'offline';
  profileImageUrl?: string;
  lastSeen?: string;
}

export default function FamilyScreen() {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    // Mock data to match the screenshot
    setFamilyMembers([
      {
        id: 1,
        firstName: 'Qing',
        lastName: 'Chang',
        email: 'qing.chang@example.com',
        status: 'offline',
        lastSeen: 'Offline for 22d',
      },
      {
        id: 2,
        firstName: 'Jing',
        lastName: 'Li',
        email: 'jing.li@example.com',
        status: 'offline',
        lastSeen: 'Offline for 22d',
        profileImageUrl: 'https://example.com/avatar.jpg', // Mock avatar
      },
    ]);
  };

  const handleGenerateCode = () => {
    Alert.alert(
      'Generate Code',
      'A new invite code will be generated for your family.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => console.log('Generate code') },
      ]
    );
  };

  const handleJoinFamily = () => {
    setShowInviteModal(true);
  };

  const handleViewMember = (member: FamilyMember) => {
    Alert.alert(
      `${member.firstName} ${member.lastName}`,
      `Status: ${member.status}\nLast seen: ${member.lastSeen}`,
      [{ text: 'OK' }]
    );
  };

  const renderFamilyMember = ({ item }: { item: FamilyMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberLeft}>
        {item.profileImageUrl ? (
          <Image
            source={{ uri: item.profileImageUrl }}
            style={styles.memberAvatar}
          />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <Text style={styles.memberInitials}>{item.firstName[0]}</Text>
          </View>
        )}

        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.firstName} {item.lastName}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    item.status === 'accepted' ? '#10B981' : '#9CA3AF',
                },
              ]}
            />
            <Text style={styles.statusText}>
              {item.status === 'accepted' ? 'Online' : item.lastSeen}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => handleViewMember(item)}
      >
        <Text style={styles.viewButtonText}>View</Text>
      </TouchableOpacity>
    </View>
  );

  const onlineMemberCount = familyMembers.filter(
    (m) => m.status === 'accepted'
  ).length;
  const totalMemberCount = familyMembers.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={24} color="#374151" />
          <Text style={styles.title}>Family Members</Text>
        </View>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>
          Manage your family connections and location sharing
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateCode}
        >
          <Ionicons name="qr-code" size={16} color="white" />
          <Text style={styles.generateButtonText}>Generate Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.joinButton} onPress={handleJoinFamily}>
          <Ionicons name="link" size={16} color="#374151" />
          <Text style={styles.joinButtonText}>Join Family</Text>
        </TouchableOpacity>
      </View>

      {/* Family Members List */}
      <View style={styles.membersSection}>
        {familyMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No family members yet</Text>
            <Text style={styles.emptyStateSubText}>
              Generate a code or join a family to get started
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={familyMembers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFamilyMember}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.membersList}
            />

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalMemberCount}</Text>
                <Text style={styles.statLabel}>Total Members</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  {onlineMemberCount}
                </Text>
                <Text style={styles.statLabel}>Online Now</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Join Family Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Family</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the invite code shared by a family member
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter invite code"
              placeholderTextColor="#9CA3AF"
              value={inviteCode}
              onChangeText={setInviteCode}
              maxLength={6}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.modalJoinButton}
              onPress={() => {
                setShowInviteModal(false);
                Alert.alert('Success', 'Successfully joined family!');
              }}
            >
              <Text style={styles.modalJoinButtonText}>Join Family</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  joinButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  membersSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  membersList: {
    paddingBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  viewButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
    paddingBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  modalJoinButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalJoinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
