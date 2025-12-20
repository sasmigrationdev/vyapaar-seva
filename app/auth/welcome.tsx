import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "@/components/ui/Text";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const AUTO_ADVANCE_INTERVAL = 5000; // 5 seconds for better readability

type Language = "en" | "hi";

// Premium stock images
const images = {
  welcome: require("@/assets/images/onboarding-welcome.jpg"),
  attendance: require("@/assets/images/onboarding-attendance.jpg"),
  salary: require("@/assets/images/onboarding-salary.jpg"),
};

// Translations
const translations = {
  en: {
    skip: "Skip",
    next: "Next",
    getStarted: "Get Started",
    slogan: "Service is Success",
    slides: [
      {
        id: "1",
        title: "VYAPAAR SEVA",
        subtitle: "Your Complete Business Partner",
        description:
          "Streamline your business operations with our all-in-one management solution.",
        image: images.welcome,
      },
      {
        id: "2",
        title: "Smart Attendance",
        subtitle: "Effortless Time Tracking",
        description:
          "Automated check-in/out with WiFi verification. Real-time tracking for your entire team.",
        image: images.attendance,
      },
      {
        id: "3",
        title: "Salary Management",
        subtitle: "Simplified Payroll",
        description:
          "Calculate salaries, manage deductions, and generate professional payslips instantly.",
        image: images.salary,
      },
    ],
  },
  hi: {
    skip: "छोड़ें",
    next: "आगे",
    getStarted: "शुरू करें",
    slogan: "सेवा ही सफलता है",
    slides: [
      {
        id: "1",
        title: "व्यापार सेवा",
        subtitle: "आपका संपूर्ण व्यापार साथी",
        description:
          "हमारे ऑल-इन-वन प्रबंधन समाधान के साथ अपने व्यापार संचालन को सुव्यवस्थित करें।",
        image: images.welcome,
      },
      {
        id: "2",
        title: "स्मार्ट हाजिरी",
        subtitle: "आसान समय ट्रैकिंग",
        description:
          "WiFi सत्यापन के साथ स्वचालित चेक-इन/आउट। आपकी पूरी टीम के लिए रीयल-टाइम ट्रैकिंग।",
        image: images.attendance,
      },
      {
        id: "3",
        title: "वेतन प्रबंधन",
        subtitle: "सरलीकृत पेरोल",
        description:
          "वेतन की गणना करें, कटौती प्रबंधित करें, और तुरंत पेशेवर पे-स्लिप बनाएं।",
        image: images.salary,
      },
    ],
  },
};

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [language, setLanguage] = useState<Language>("hi");
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const t = translations[language];

  // Auto-advance logic
  useEffect(() => {
    if (!autoAdvanceEnabled) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= t.slides.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, AUTO_ADVANCE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoAdvanceEnabled]);

  const stopAutoAdvance = () => {
    setAutoAdvanceEnabled(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleNext = () => {
    stopAutoAdvance();
    if (currentIndex < t.slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/auth/login");
    }
  };

  const handleSkip = () => {
    stopAutoAdvance();
    router.replace("/auth/login");
  };

  const toggleLanguage = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setLanguage((prev) => (prev === "en" ? "hi" : "en"));
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    stopAutoAdvance();
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleScrollBeginDrag = () => {
    stopAutoAdvance();
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: (typeof t.slides)[0];
    index: number;
  }) => {
    const isFirstSlide = index === 0;

    return (
      <View style={styles.slide}>
        {/* Background - Gradient for first slide, Image for others */}
        {isFirstSlide ? (
          <LinearGradient
            colors={["#E67300", "#FF9933", "#FFB366", "#FFCC80"]}
            locations={[0, 0.3, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={styles.gradientBackground}
          />
        ) : (
          <ImageBackground
            source={item.image}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.1)",
                "rgba(0,0,0,0.3)",
                "rgba(0,0,0,0.7)",
                "rgba(0,0,0,0.9)",
              ]}
              locations={[0, 0.3, 0.6, 1]}
              style={styles.imageOverlay}
            />
          </ImageBackground>
        )}

        {/* Content */}
        <View style={[styles.contentContainer, isFirstSlide && styles.contentContainerFirst]}>
          {/* Logo and Slogan for first slide */}
          {isFirstSlide && (
            <View style={styles.brandingContainer}>
              <Image
                source={require("@/assets/images/logovs.png")}
                style={styles.logoLarge}
                resizeMode="contain"
              />
              <View style={styles.sloganBadge}>
                <Text style={styles.sloganText}>{t.slogan}</Text>
              </View>
            </View>
          )}

          {/* Main Content */}
          <Animated.View style={[styles.textContent, isFirstSlide && styles.textContentFirst, { opacity: fadeAnim }]}>
            <Text style={[styles.title, isFirstSlide && styles.titleFirst]}>{item.title}</Text>
            <Text style={[styles.subtitle, isFirstSlide && styles.subtitleFirst]}>{item.subtitle}</Text>
            <Text style={[styles.description, isFirstSlide && styles.descriptionFirst]}>{item.description}</Text>
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {t.slides.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 32, 8],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ["#FFFFFF60", "#FF9933", "#FFFFFF60"],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Header Controls */}
      <View style={styles.headerControls}>
        {/* Language Selector */}
        <TouchableOpacity
          style={styles.languageButton}
          onPress={toggleLanguage}
          activeOpacity={0.8}
        >
          <BlurView intensity={30} tint="dark" style={styles.blurButton}>
            <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
            <Text style={styles.languageText}>
              {language === "en" ? "हिंदी" : "ENG"}
            </Text>
          </BlurView>
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <BlurView intensity={30} tint="dark" style={styles.blurButton}>
            <Text style={styles.skipText}>{t.skip}</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={t.slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={16}
        extraData={language}
      />

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {renderPagination()}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#FF9933", "#E67300"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {currentIndex === t.slides.length - 1 ? t.getStarted : t.next}
            </Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons
                name={
                  currentIndex === t.slides.length - 1
                    ? "checkmark"
                    : "arrow-forward"
                }
                size={20}
                color="#FFFFFF"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: scrollX.interpolate({
                    inputRange: [0, SCREEN_WIDTH * (t.slides.length - 1)],
                    outputRange: ["33%", "100%"],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gradientBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    flex: 1,
  },
  headerControls: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 100,
  },
  languageButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  skipButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  blurButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    borderRadius: 24,
    overflow: "hidden",
  },
  languageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  contentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 200,
  },
  contentContainerFirst: {
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingBottom: 160,
  },
  brandingContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  logoLarge: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  sloganBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  sloganText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  textContent: {
    alignItems: "flex-start",
  },
  textContentFirst: {
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  titleFirst: {
    fontSize: 32,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF9933",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitleFirst: {
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  descriptionFirst: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.85)",
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  paginationDot: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  actionButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF9933",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    marginTop: 20,
    paddingHorizontal: 40,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FF9933",
    borderRadius: 2,
  },
});
