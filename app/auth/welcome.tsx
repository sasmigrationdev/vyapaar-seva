import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/Text";
import { DepthButton } from "@/components/ui/DepthButton";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, Gradients, Typography, Spacing } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH * 0.65;

type Language = "en" | "hi";

const images = {
  welcome: require("@/assets/images/onboarding-welcome.jpg"),
  attendance: require("@/assets/images/onboarding-attendance.jpg"),
  salary: require("@/assets/images/onboarding-salary.jpg"),
};

const translations = {
  en: {
    skip: "Skip",
    next: "Continue",
    getStarted: "Get Started",
    slogan: "Service is Success",
    slides: [
      {
        id: "1",
        title: "VYAPAAR SEWA",
        subtitle: "Your Complete Business Partner",
        description: "Streamline your business operations with our all-in-one management solution.",
        icon: "briefcase-outline",
        image: images.welcome,
        color: Colors.primary,
      },
      {
        id: "2",
        title: "Smart Attendance",
        subtitle: "Effortless Time Tracking",
        description: "Automated check-in/out with WiFi verification. Real-time tracking for your entire team.",
        icon: "finger-print",
        image: images.attendance,
        color: "#6366f1",
      },
      {
        id: "3",
        title: "Salary Management",
        subtitle: "Simplified Payroll",
        description: "Calculate salaries, manage deductions, and generate professional payslips instantly.",
        icon: "wallet-outline",
        image: images.salary,
        color: "#10b981",
      },
    ],
  },
  hi: {
    skip: "छोड़ें",
    next: "आगे बढ़ें",
    getStarted: "शुरू करें",
    slogan: "सेवा ही सफलता है",
    slides: [
      {
        id: "1",
        title: "व्यापार सेवा",
        subtitle: "आपका संपूर्ण व्यापार साथी",
        description: "हमारे ऑल-इन-वन प्रबंधन समाधान के साथ अपने व्यापार संचालन को सुव्यवस्थित करें।",
        icon: "briefcase-outline",
        image: images.welcome,
        color: Colors.primary,
      },
      {
        id: "2",
        title: "स्मार्ट हाजिरी",
        subtitle: "आसान समय ट्रैकिंग",
        description: "WiFi सत्यापन के साथ स्वचालित चेक-इन/आउट। आपकी पूरी टीम के लिए रीयल-टाइम ट्रैकिंग।",
        icon: "finger-print",
        image: images.attendance,
        color: "#6366f1",
      },
      {
        id: "3",
        title: "वेतन प्रबंधन",
        subtitle: "सरलीकृत पेरोल",
        description: "वेतन की गणना करें, कटौती प्रबंधित करें, और तुरंत पेशेवर पे-स्लिप बनाएं।",
        icon: "wallet-outline",
        image: images.salary,
        color: "#10b981",
      },
    ],
  },
};

function Slide({
  item,
  index,
  scrollX,
  isFirst,
  slogan,
}: {
  item: (typeof translations.en.slides)[0];
  index: number;
  scrollX: Animated.SharedValue<number>;
  isFirst: boolean;
  slogan: string;
}) {
  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP),
      },
      {
        translateX: interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP),
      },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP),
      },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.slide}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        {isFirst ? (
          // First slide - Logo
          <Animated.View style={[styles.logoSection, imageStyle]}>
            <View style={[styles.logoBg, { backgroundColor: item.color + "15" }]}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require("@/assets/images/logovs.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Animated.View>
        ) : (
          // Feature slides - Contained image
          <Animated.View style={[styles.imageContainer, imageStyle]}>
            <View style={[styles.imageGlow, { backgroundColor: item.color + "20" }]} />
            <View style={styles.imageWrapper}>
              <Image source={item.image} style={styles.image} resizeMode="cover" />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.3)"]}
                style={styles.imageOverlay}
              />
              {/* Feature icon badge */}
              <View style={[styles.iconBadge, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={24} color={Colors.textInverse} />
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Content Section */}
      <Animated.View style={[styles.contentSection, contentStyle]}>
        {isFirst ? (
          <>
            <Text style={styles.brandTitle}>{item.title}</Text>
            <View style={styles.sloganContainer}>
              <View style={[styles.sloganLine, { backgroundColor: item.color }]} />
              <Text style={[styles.sloganText, { color: item.color }]}>{slogan}</Text>
              <View style={[styles.sloganLine, { backgroundColor: item.color }]} />
            </View>
            <Text style={styles.description}>{item.description}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("en");
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const insets = useSafeAreaInsets();

  const t = translations[language];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev < t.slides.length - 1) {
          const nextIndex = prev + 1;
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          return nextIndex;
        }
        return prev;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentIndex < t.slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.replace("/auth/login");
    }
  };

  const handleSkip = () => {
    router.replace("/auth/login");
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  };

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const PaginationDot = ({ index }: { index: number }) => {
    const dotStyle = useAnimatedStyle(() => {
      const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
      return {
        width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
        opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
      };
    });

    return <Animated.View style={[styles.paginationDot, dotStyle]} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <TouchableOpacity style={styles.headerButton} onPress={toggleLanguage} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={18} color={Colors.text} />
          <Text style={styles.headerButtonText}>{language === "en" ? "हिंदी" : "ENG"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t.skip}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={t.slides}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} isFirst={index === 0} slogan={t.slogan} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom Section */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={[styles.bottomSection, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        {/* Pagination */}
        <View style={styles.pagination}>
          {t.slides.map((_, index) => (
            <PaginationDot key={index} index={index} />
          ))}
        </View>

        {/* Button */}
        <DepthButton
          onPress={handleNext}
          variant="primary"
          size="lg"
          icon={
            <Ionicons
              name={currentIndex === t.slides.length - 1 ? "checkmark" : "arrow-forward"}
              size={20}
              color={Colors.textInverse}
            />
          }
        >
          {currentIndex === t.slides.length - 1 ? t.getStarted : t.next}
        </DepthButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
  },
  headerButtonText: {
    color: Colors.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },

  // Image Section
  imageSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.xl,
  },

  // Logo (first slide)
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoBg: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    width: IMAGE_SIZE * 0.6,
    height: IMAGE_SIZE * 0.6,
    borderRadius: (IMAGE_SIZE * 0.6) / 2,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: IMAGE_SIZE * 0.45,
    height: IMAGE_SIZE * 0.45,
  },

  // Image (feature slides)
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageGlow: {
    position: "absolute",
    width: IMAGE_SIZE + 40,
    height: IMAGE_SIZE + 40,
    borderRadius: 32,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: Colors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconBadge: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Content Section
  contentSection: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  sloganContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sloganLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  sloganText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  paginationDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});
