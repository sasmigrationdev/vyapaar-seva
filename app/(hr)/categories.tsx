import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useAlert } from '@/hooks/useAlert';
import { Text } from '@/components/ui/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/auth/useAuth';
import { useCategories } from '@/hooks/queries/useFinancial';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/mutations/useFinancialMutations';
import CategoryModal from '@/components/financial/CategoryModal';
import { FinancialCategory } from '@/lib/types/financial.types';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function CategoriesScreen() {
  const { user } = useAuth();
  const { confirmDestructive } = useAlert();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);

  const { data: incomeCategories, isLoading: loadingIncome } = useCategories(
    user?.organization_id || '',
    'income',
    { enabled: !!user?.organization_id }
  );

  const { data: expenseCategories, isLoading: loadingExpense } = useCategories(
    user?.organization_id || '',
    'expense',
    { enabled: !!user?.organization_id }
  );

  const createCategoryMutation = useCreateCategory(user?.organization_id || '', {
    onSuccess: () => {
      setShowModal(false);
      setEditingCategory(null);
    },
  });

  const updateCategoryMutation = useUpdateCategory(user?.organization_id || '', {
    onSuccess: () => {
      setShowModal(false);
      setEditingCategory(null);
    },
  });

  const deleteCategoryMutation = useDeleteCategory(user?.organization_id || '');

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEditCategory = (category: FinancialCategory) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDeleteCategory = (category: FinancialCategory) => {
    confirmDestructive(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This won't delete transactions but will unlink them from this category.`,
      () => deleteCategoryMutation.mutate(category.id),
      undefined,
      'Delete'
    );
  };

  const handleSubmit = (data: any) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({
        categoryId: editingCategory.id,
        updates: {
          name: data.name,
          color: data.color,
        },
      });
    } else {
      createCategoryMutation.mutate({
        ...data,
        createdBy: user?.id || '',
      });
    }
  };

  const renderCategoryItem = (category: FinancialCategory) => (
    <View key={category.id} style={styles.categoryItem}>
      <View style={styles.categoryLeft}>
        <View style={[styles.colorDot, { backgroundColor: category.color }]} />
        <Text style={styles.categoryName}>{category.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditCategory(category)}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="#6366F1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteCategory(category)}
        >
          <MaterialCommunityIcons name="delete" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={handleAddCategory} style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Income Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="arrow-down" size={22} color="#10B981" />
            <Text style={styles.sectionTitle}>Income Categories</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{incomeCategories?.length || 0}</Text>
            </View>
          </View>

          <View style={styles.categoryList}>
            {loadingIncome ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : incomeCategories && incomeCategories.length > 0 ? (
              incomeCategories.map(renderCategoryItem)
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="folder-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No income categories yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Expense Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="arrow-up" size={22} color="#EF4444" />
            <Text style={styles.sectionTitle}>Expense Categories</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{expenseCategories?.length || 0}</Text>
            </View>
          </View>

          <View style={styles.categoryList}>
            {loadingExpense ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : expenseCategories && expenseCategories.length > 0 ? (
              expenseCategories.map(renderCategoryItem)
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="folder-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>No expense categories yet</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.hint}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#6366F1" />
          <Text style={styles.hintText}>
            Categories help you organize your transactions. Create custom categories for better tracking.
          </Text>
        </View>
      </ScrollView>

      <CategoryModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
        category={editingCategory}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: Spacing.md,
    paddingTop: 60,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  categoryList: {
    gap: Spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  emptyState: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  hint: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginTop: Spacing.sm,
  },
  hintText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    lineHeight: 18,
  },
});
