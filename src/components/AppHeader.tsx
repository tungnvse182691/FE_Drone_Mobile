import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { RoleCode } from '../types/enums';

interface AppHeaderProps {
  subtitle: string;
  showBack?: boolean;
  onBack?: () => void;
  fallbackRoute?: string;
}

export function AppHeader({ subtitle, showBack = false, onBack, fallbackRoute }: AppHeaderProps) {
  const role = useAuthStore((state) => state.role);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else if (fallbackRoute) {
      router.replace(fallbackRoute as any);
    } else {
      router.back();
    }
  };

  const handleAvatarPress = () => {
    if (role === RoleCode.SUPERVISOR) {
      router.push('/(sup)/profile');
    } else if (role === RoleCode.DRONE_OPERATOR) {
      router.push('/(drone)/profile');
    } else if (role === RoleCode.REPAIR_CREW) {
      router.push('/(crew)/profile');
    } else if (role === RoleCode.PROJECT_MANAGER) {
      router.push('/(pm)/profile');
    } else {
      router.push('/(sup)/profile');
    }
  };

  const handleNotificationPress = () => {
    Alert.alert(
      'Thông báo hệ thống',
      'Hiện tại không có cảnh báo mới. Tất cả các tuyến đường đang trong tầm kiểm soát.',
      [{ text: 'Đóng' }],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandGroup}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral} />
          </Pressable>
        ) : null}
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={[typography.titleMd, styles.brand]}>HOÀNG HẢI</Text>
          <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.actionGroup}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.actionPressed]}
          onPress={handleNotificationPress}
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.secondary} />
          <View style={styles.dot} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.avatar, pressed && styles.actionPressed]}
          onPress={handleAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Trang cá nhân"
        >
          <Ionicons name="person" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.border,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brand: {
    fontFamily: 'Sansation',
    color: colors.brandGold,
  },
  subtitle: {
    color: colors.secondary,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPressed: {
    opacity: 0.7,
    backgroundColor: colors.border,
  },
});
