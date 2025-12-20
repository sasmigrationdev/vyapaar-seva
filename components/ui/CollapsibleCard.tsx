import { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleCard({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = false,
}: CollapsibleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const animatedValue = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;

    Animated.spring(animatedValue, {
      toValue,
      useNativeDriver: false,
      damping: 15,
      stiffness: 150,
    }).start();

    setExpanded(!expanded);
  };

  const chevronRotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const contentOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const contentScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={20} color="#6366F1" />
            </View>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {(subtitle && !expanded) && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons
            name="chevron-down"
            size={20}
            color="#64748B"
          />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: contentOpacity,
              transform: [{ scaleY: contentScale }],
            },
          ]}
        >
          <View style={styles.content}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
    marginTop: 3,
  },
  contentWrapper: {
    overflow: 'hidden',
  },
  content: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
