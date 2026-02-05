/**
 * AnimatedStatsRow
 *
 * Paytm-inspired stats display with:
 * - Counting animation on numbers
 * - Trend indicators
 * - Gradient accents
 * - Staggered entry animations
 */
import { Text } from "@/components/ui/Text";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Animated, Easing, TouchableOpacity } from "react-native";
import AnimatedRN, { FadeInRight, FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

type IconName = keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;

interface StatItem {
  value: number;
  label: string;
  icon: IconName;
  iconType?: "ionicons" | "material";
  color: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onPress?: () => void;
  highlight?: boolean;
}

interface AnimatedStatsRowProps {
  stats: StatItem[];
  cardWidth?: number;
  variant?: "scroll" | "grid" | "compact";
}

// Animated counter component
function AnimatedCounter({
  value,
  color,
  size = "normal",
}: {
  value: number;
  color: string;
  size?: "normal" | "large";
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const fontSize = size === "large" ? 30 : 24;

  return (
    <Animated.Text
      style={[
        styles.statValue,
        { color, fontSize },
      ]}
    >
      {animatedValue.interpolate({
        inputRange: [0, value],
        outputRange: ["0", String(value)],
        extrapolate: "clamp",
      })}
    </Animated.Text>
  );
}

// Individual stat card
function StatCard({
  stat,
  index,
  cardWidth,
  variant,
}: {
  stat: StatItem;
  index: number;
  cardWidth: number;
  variant: "scroll" | "grid" | "compact";
}) {
  const IconComponent = stat.iconType === "material" ? MaterialCommunityIcons : Ionicons;
  const isCompact = variant === "compact";

  const CardWrapper = stat.onPress ? TouchableOpacity : View;

  const content = (
    <CardWrapper
      style={[
        styles.statCard,
        isCompact ? styles.statCardCompact : { width: cardWidth },
        stat.highlight && styles.statCardHighlight,
      ]}
      onPress={stat.onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${stat.label}: ${stat.value}${stat.trendValue ? `, ${stat.trend === 'up' ? 'up' : stat.trend === 'down' ? 'down' : ''} ${stat.trendValue}` : ''}`}
      accessibilityRole={stat.onPress ? "button" : "text"}
    >
      {/* Icon with gradient background */}
      <View style={[styles.iconContainer, { backgroundColor: stat.color + "12" }]}>
        <IconComponent name={stat.icon as any} size={isCompact ? 18 : 22} color={stat.color} />
      </View>

      {/* Value and label */}
      <View style={styles.statContent}>
        <AnimatedCounter value={stat.value} color={stat.color} size={isCompact ? "normal" : "large"} />
        <Text style={styles.statLabel} numberOfLines={1}>
          {stat.label}
        </Text>
      </View>

      {/* Trend indicator */}
      {stat.trend && stat.trendValue && (
        <View
          style={[
            styles.trendBadge,
            {
              backgroundColor:
                stat.trend === "up"
                  ? Colors.success + "15"
                  : stat.trend === "down"
                  ? Colors.error + "15"
                  : Colors.gray100,
            },
          ]}
        >
          <Ionicons
            name={stat.trend === "up" ? "arrow-up" : stat.trend === "down" ? "arrow-down" : "remove"}
            size={10}
            color={
              stat.trend === "up"
                ? Colors.success
                : stat.trend === "down"
                ? Colors.error
                : Colors.textTertiary
            }
          />
          <Text
            style={[
              styles.trendText,
              {
                color:
                  stat.trend === "up"
                    ? Colors.success
                    : stat.trend === "down"
                    ? Colors.error
                    : Colors.textTertiary,
              },
            ]}
          >
            {stat.trendValue}
          </Text>
        </View>
      )}

      {/* Highlight indicator */}
      {stat.highlight && (
        <View style={styles.highlightDot}>
          <View style={[styles.highlightDotInner, { backgroundColor: stat.color }]} />
        </View>
      )}
    </CardWrapper>
  );

  return (
    <AnimatedRN.View entering={FadeInRight.delay(80 * index).springify()}>
      {content}
    </AnimatedRN.View>
  );
}

export default function AnimatedStatsRow({
  stats,
  cardWidth = 130,
  variant = "scroll",
}: AnimatedStatsRowProps) {
  if (variant === "grid") {
    return (
      <AnimatedRN.View entering={FadeIn.delay(100).springify()} style={styles.gridContainer}>
        {stats.map((stat, index) => (
          <StatCard
            key={`${stat.label}-${index}`}
            stat={stat}
            index={index}
            cardWidth={cardWidth}
            variant="grid"
          />
        ))}
      </AnimatedRN.View>
    );
  }

  if (variant === "compact") {
    return (
      <AnimatedRN.View entering={FadeIn.delay(100).springify()} style={styles.compactContainer}>
        {stats.slice(0, 4).map((stat, index) => (
          <StatCard
            key={`${stat.label}-${index}`}
            stat={stat}
            index={index}
            cardWidth={cardWidth}
            variant="compact"
          />
        ))}
      </AnimatedRN.View>
    );
  }

  return (
    <AnimatedRN.View entering={FadeIn.delay(100).springify()} style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={cardWidth + Spacing.md}
      >
        {stats.map((stat, index) => (
          <StatCard
            key={`${stat.label}-${index}`}
            stat={stat}
            index={index}
            cardWidth={cardWidth}
            variant="scroll"
          />
        ))}
      </ScrollView>
    </AnimatedRN.View>
  );
}

// Hero stat card - large prominent display
export function HeroStatCard({
  stat,
  subtitle,
}: {
  stat: StatItem;
  subtitle?: string;
}) {
  const IconComponent = stat.iconType === "material" ? MaterialCommunityIcons : Ionicons;

  return (
    <AnimatedRN.View entering={FadeInUp.delay(100).springify()} style={styles.heroCard}>
      <LinearGradient
        colors={[stat.color, stat.color + "DD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={styles.heroIconWrapper}>
          <IconComponent name={stat.icon as any} size={28} color="#FFFFFF" />
        </View>
        <View style={styles.heroContent}>
          <AnimatedCounter value={stat.value} color="#FFFFFF" size="large" />
          <Text style={styles.heroLabel}>{stat.label}</Text>
          {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
        </View>
        {stat.trend && stat.trendValue && (
          <View style={styles.heroTrend}>
            <Ionicons
              name={stat.trend === "up" ? "trending-up" : "trending-down"}
              size={16}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.heroTrendText}>{stat.trendValue}</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedRN.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  compactContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  // Stat card styles - Premium refined
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: Spacing.lg + 2,
    gap: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statCardCompact: {
    flex: 1,
    padding: Spacing.md + 2,
    alignItems: "center",
  },
  statCardHighlight: {
    borderWidth: 2,
    borderColor: Colors.primary + "25",
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    gap: 3,
  },
  statValue: {
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B6B6B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  highlightDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  highlightDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Hero card styles
  heroCard: {
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius["3xl"],
    overflow: "hidden",
    ...Shadows.lg,
  },
  heroGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  heroTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  heroTrendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
