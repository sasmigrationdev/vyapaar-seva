/**
 * MarketingBanner
 *
 * Versatile banner component for promotional content, announcements, or feature highlights.
 * Supports multiple variants: image, gradient, glass
 */
import { Text } from "@/components/ui/Text";
import { BorderRadius, Colors, Shadows, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MarketingBannerProps {
  // Content
  title?: string;
  subtitle?: string;
  ctaText?: string;
  onPress?: () => void;
  onDismiss?: () => void;

  // Image
  imageSource?: string | number; // URL string or require() number
  imagePosition?: "background" | "right" | "left";

  // Styling
  variant?: "image" | "gradient" | "glass" | "minimal";
  gradientColors?: readonly [string, string, ...string[]];
  height?: number;
  aspectRatio?: number; // e.g., 16/9, 3/1

  // Badge
  badge?: string;
  badgeColor?: string;
}

export default function MarketingBanner({
  title,
  subtitle,
  ctaText,
  onPress,
  onDismiss,
  imageSource,
  imagePosition = "background",
  variant = "gradient",
  gradientColors = ["#FF9933", "#E67300"] as const,
  height,
  aspectRatio = 2.5,
  badge,
  badgeColor = Colors.success,
}: MarketingBannerProps) {
  const bannerHeight = height || SCREEN_WIDTH / aspectRatio;

  // Render dismiss button
  const renderDismiss = () =>
    onDismiss && (
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    );

  // Render badge
  const renderBadge = () =>
    badge && (
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    );

  // Render content overlay
  const renderContent = () => (
    <View style={styles.contentOverlay}>
      {renderBadge()}
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {ctaText && (
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>{ctaText}</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
        </View>
      )}
    </View>
  );

  // Accessibility label helper
  const getAccessibilityLabel = () => {
    const parts = [];
    if (title) parts.push(title);
    if (subtitle) parts.push(subtitle);
    if (ctaText) parts.push(`Tap to ${ctaText.toLowerCase()}`);
    return parts.join(". ");
  };

  // Image background variant - supports image-only mode (no text overlay)
  if (variant === "image" && imageSource) {
    const source = typeof imageSource === "string" ? { uri: imageSource } : imageSource;
    const hasTextContent = title || subtitle || ctaText || badge;

    return (
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <TouchableOpacity
          style={[styles.container, { height: bannerHeight }]}
          onPress={onPress}
          activeOpacity={onPress ? 0.9 : 1}
          disabled={!onPress}
          accessibilityLabel={getAccessibilityLabel() || "Promotional banner"}
          accessibilityRole={onPress ? "button" : "image"}
        >
          <Image source={source} style={styles.backgroundImage} resizeMode="cover" />
          {hasTextContent && (
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.imageOverlay}
            />
          )}
          {renderDismiss()}
          {hasTextContent && renderContent()}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Gradient variant (default)
  if (variant === "gradient") {
    return (
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <TouchableOpacity
          style={[styles.container, { height: bannerHeight }]}
          onPress={onPress}
          activeOpacity={onPress ? 0.9 : 1}
          disabled={!onPress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityRole={onPress ? "button" : "text"}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            {renderDismiss()}
            <View style={styles.gradientContent}>
              <View style={styles.textContent}>
                {renderBadge()}
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                {ctaText && (
                  <View style={styles.ctaButtonGradient}>
                    <Text style={styles.ctaTextGradient}>{ctaText}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              {imageSource && imagePosition === "right" && (
                <Image
                  source={typeof imageSource === "string" ? { uri: imageSource } : imageSource}
                  style={styles.sideImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Glass variant
  if (variant === "glass") {
    return (
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <TouchableOpacity
          style={[styles.glassContainer, { minHeight: bannerHeight * 0.8 }]}
          onPress={onPress}
          activeOpacity={onPress ? 0.9 : 1}
          disabled={!onPress}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityRole={onPress ? "button" : "text"}
        >
          {renderDismiss()}
          <View style={styles.glassContent}>
            {imageSource && (
              <View style={styles.glassImageWrapper}>
                <Image
                  source={typeof imageSource === "string" ? { uri: imageSource } : imageSource}
                  style={styles.glassImage}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={styles.glassTextContent}>
              {renderBadge()}
              {title && <Text style={styles.glassTitle}>{title}</Text>}
              {subtitle && <Text style={styles.glassSubtitle}>{subtitle}</Text>}
              {ctaText && (
                <View style={styles.glassCtaButton}>
                  <Text style={styles.glassCtaText}>{ctaText}</Text>
                  <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Minimal variant - simple card style
  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <TouchableOpacity
        style={styles.minimalContainer}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityRole={onPress ? "button" : "text"}
      >
        {imageSource && (
          <Image
            source={typeof imageSource === "string" ? { uri: imageSource } : imageSource}
            style={styles.minimalImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.minimalContent}>
          {badge && (
            <View style={[styles.minimalBadge, { backgroundColor: badgeColor + "20" }]}>
              <Text style={[styles.minimalBadgeText, { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
          {title && <Text style={styles.minimalTitle}>{title}</Text>}
          {subtitle && <Text style={styles.minimalSubtitle}>{subtitle}</Text>}
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Carousel variant for multiple banners with auto-rotation
export function MarketingBannerCarousel({
  banners,
  autoScroll = true,
  interval = 5000,
}: {
  banners: MarketingBannerProps[];
  autoScroll?: boolean;
  interval?: number;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const flatListRef = React.useRef<any>(null);
  const bannerWidth = SCREEN_WIDTH - 32; // Account for horizontal margin (16px each side)

  // Auto-scroll effect
  React.useEffect(() => {
    if (!autoScroll || banners.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * bannerWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [autoScroll, interval, banners.length, bannerWidth]);

  // Handle manual scroll
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / bannerWidth);
    if (index !== activeIndex && index >= 0 && index < banners.length) {
      setActiveIndex(index);
    }
  };

  if (banners.length === 0) return null;

  // Single banner - no carousel needed
  if (banners.length === 1) {
    return <MarketingBanner {...banners[0]} />;
  }

  return (
    <View style={carouselStyles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        snapToAlignment="center"
        contentContainerStyle={carouselStyles.listContent}
        keyExtractor={(_, index) => `banner-${index}`}
        renderItem={({ item, index }) => (
          <View style={[carouselStyles.bannerItem, { width: bannerWidth }]}>
            <MarketingBanner {...item} />
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={carouselStyles.pagination}>
        {banners.map((_, index) => (
          <TouchableOpacity
            key={`dot-${index}`}
            onPress={() => {
              flatListRef.current?.scrollToOffset({
                offset: index * bannerWidth,
                animated: true,
              });
              setActiveIndex(index);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <View
              style={[
                carouselStyles.dot,
                activeIndex === index && carouselStyles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const carouselStyles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  bannerItem: {
    paddingHorizontal: 0,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
});

// Placeholder banner for when no image is available
export function PlaceholderBanner({
  title = "Coming Soon",
  subtitle = "New features are on the way",
  icon = "rocket-outline" as keyof typeof Ionicons.glyphMap,
  gradientColors = ["#6366F1", "#8B5CF6"] as const,
  onPress,
}: {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  gradientColors?: readonly [string, string];
  onPress?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <TouchableOpacity
        style={styles.placeholderContainer}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityRole={onPress ? "button" : "text"}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.placeholderGradient}
        >
          <View style={styles.placeholderIconWrapper}>
            <Ionicons name={icon} size={32} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.placeholderTextContent}>
            <Text style={styles.placeholderTitle}>{title}</Text>
            <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Base container - refined shadows
  container: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  dismissButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    marginTop: 3,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md + 2,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Gradient variant - softer transitions
  gradientBackground: {
    flex: 1,
    borderRadius: 16,
  },
  gradientContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  sideImage: {
    width: 100,
    height: 100,
  },
  ctaButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  ctaTextGradient: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Glass variant - refined
  glassContainer: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  glassContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  glassImageWrapper: {
    width: 120,
    height: "100%",
  },
  glassImage: {
    width: "100%",
    height: "100%",
  },
  glassTextContent: {
    flex: 1,
    padding: Spacing.lg + 2,
    gap: 4,
  },
  glassTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  glassSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5C5C5C",
    lineHeight: 17,
  },
  glassCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: Spacing.sm + 2,
  },
  glassCtaText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Minimal variant
  minimalContainer: {
    marginHorizontal: Spacing.xl,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...Shadows.sm,
  },
  minimalImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
  },
  minimalContent: {
    flex: 1,
    gap: 2,
  },
  minimalBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: 2,
  },
  minimalBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  minimalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  minimalSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },

  // Placeholder variant - refined
  placeholderContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  placeholderGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: Spacing.md,
  },
  placeholderIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderTextContent: {
    flex: 1,
    gap: 5,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  placeholderSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
});
