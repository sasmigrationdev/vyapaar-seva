import React from "react";
import { View, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, Shadows } from "@/constants/theme";

type IconLibrary = "ionicons" | "material-community";

interface ActionButton {
  label: string;
  onPress: () => void;
  icon?: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface EmptyStateProps {
  icon: string;
  iconLibrary?: IconLibrary;
  title: string;
  subtitle?: string;
  actionButton?: ActionButton;
  secondaryAction?: ActionButton;
  style?: ViewStyle;
  compact?: boolean;
}

/**
 * EmptyState - Standardized empty state component for consistent UX across all screens.
 * Use this when there's no data to display (empty lists, no results, new user states).
 */
export default function EmptyState({
  icon,
  iconLibrary = "ionicons",
  title,
  subtitle,
  actionButton,
  secondaryAction,
  style,
  compact = false,
}: EmptyStateProps) {
  const IconComponent = iconLibrary === "material-community"
    ? MaterialCommunityIcons
    : Ionicons;

  const getButtonStyles = (variant: ActionButton["variant"] = "primary") => {
    switch (variant) {
      case "secondary":
        return {
          container: styles.secondaryButton,
          text: styles.secondaryButtonText,
        };
      case "ghost":
        return {
          container: styles.ghostButton,
          text: styles.ghostButtonText,
        };
      default:
        return {
          container: styles.primaryButton,
          text: styles.primaryButtonText,
        };
    }
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {/* Icon */}
      <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
        <IconComponent
          name={icon as any}
          size={compact ? 40 : 56}
          color={Colors.gray300}
        />
      </View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Actions */}
      {(actionButton || secondaryAction) && (
        <View style={styles.actionsContainer}>
          {actionButton && (
            <TouchableOpacity
              style={[
                styles.button,
                getButtonStyles(actionButton.variant).container,
              ]}
              onPress={actionButton.onPress}
              activeOpacity={0.8}
              accessibilityLabel={actionButton.label}
              accessibilityRole="button"
            >
              {actionButton.icon && (
                <Ionicons
                  name={actionButton.icon as any}
                  size={18}
                  color={
                    actionButton.variant === "primary" || !actionButton.variant
                      ? Colors.textInverse
                      : Colors.primary
                  }
                />
              )}
              <Text style={getButtonStyles(actionButton.variant).text}>
                {actionButton.label}
              </Text>
            </TouchableOpacity>
          )}

          {secondaryAction && (
            <TouchableOpacity
              style={[
                styles.button,
                getButtonStyles(secondaryAction.variant || "ghost").container,
              ]}
              onPress={secondaryAction.onPress}
              activeOpacity={0.8}
              accessibilityLabel={secondaryAction.label}
              accessibilityRole="button"
            >
              {secondaryAction.icon && (
                <Ionicons
                  name={secondaryAction.icon as any}
                  size={18}
                  color={Colors.primary}
                />
              )}
              <Text style={getButtonStyles(secondaryAction.variant || "ghost").text}>
                {secondaryAction.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Preset empty states for common scenarios
 */

export function NoDataEmptyState({
  title = "No data yet",
  subtitle = "Data will appear here once available",
  onRefresh,
}: {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      icon="file-tray-outline"
      title={title}
      subtitle={subtitle}
      actionButton={
        onRefresh
          ? {
              label: "Refresh",
              onPress: onRefresh,
              icon: "refresh",
              variant: "secondary",
            }
          : undefined
      }
    />
  );
}

export function NoSearchResultsEmptyState({
  searchQuery,
  onClear,
}: {
  searchQuery: string;
  onClear: () => void;
}) {
  return (
    <EmptyState
      icon="search-outline"
      title="No results found"
      subtitle={`No matches for "${searchQuery}". Try different keywords.`}
      actionButton={{
        label: "Clear search",
        onPress: onClear,
        icon: "close-circle",
        variant: "secondary",
      }}
    />
  );
}

export function NoConnectionEmptyState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="No connection"
      subtitle="Please check your internet connection and try again."
      actionButton={{
        label: "Try again",
        onPress: onRetry,
        icon: "refresh",
        variant: "primary",
      }}
    />
  );
}

export function ErrorEmptyState({
  message = "Something went wrong",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="alert-circle-outline"
      title="Error"
      subtitle={message}
      actionButton={
        onRetry
          ? {
              label: "Try again",
              onPress: onRetry,
              icon: "refresh",
              variant: "primary",
            }
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  containerCompact: {
    paddingVertical: Spacing["2xl"],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gray50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainerCompact: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: Spacing.lg,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  titleCompact: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  subtitleCompact: {
    fontSize: 13,
    maxWidth: 240,
  },
  actionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: Spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    minWidth: 140,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  ghostButton: {
    backgroundColor: "transparent",
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
});
