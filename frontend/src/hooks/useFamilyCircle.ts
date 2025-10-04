/**
 * useFamilyCircle Hook
 *
 * Provides access to family circle members and their information.
 */

import { useState, useEffect } from 'react';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface FamilyCircleData {
  familyMembers: FamilyMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to access family circle members
 */
export const useFamilyCircle = (): FamilyCircleData => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - in production this would fetch from family circle API
      const mockMembers: FamilyMember[] = [
        {
          id: '1',
          name: 'Ahmad',
          relationship: 'Spouse',
          email: 'ahmad@example.com',
        },
        {
          id: '2',
          name: 'Siti',
          relationship: 'Mother',
          email: 'siti@example.com',
        },
        {
          id: '3',
          name: 'Fatimah',
          relationship: 'Daughter',
          email: 'fatimah@example.com',
        },
      ];

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFamilyMembers(mockMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family members');
      console.error('Error loading family members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const refresh = async () => {
    await loadFamilyMembers();
  };

  return {
    familyMembers,
    loading,
    error,
    refresh,
  };
};

export default useFamilyCircle;
