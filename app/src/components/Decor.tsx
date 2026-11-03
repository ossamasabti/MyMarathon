import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ComponentProps } from 'react';
import { Platform, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Floater {
  icon: IconName;
  top: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  size: number;
  delay: number;
}

/** The race, faintly drawn in the background. */
const FLOATERS: readonly Floater[] = [
  { icon: 'flag', top: '12%', left: '5%', size: 44, delay: 0 },
  { icon: 'trophy', top: '68%', left: '9%', size: 40, delay: 2000 },
  { icon: 'footsteps', top: '20%', left: '46%', size: 38, delay: 4000 },
  { icon: 'medal', top: '78%', left: '50%', size: 42, delay: 6000 },
  { icon: 'stopwatch', top: '10%', right: '7%', size: 46, delay: 3000 },
  { icon: 'rocket', top: '58%', right: '4%', size: 40, delay: 5000 },
  { icon: 'star', top: '42%', left: '28%', size: 30, delay: 7000 },
];

function FloatingIcon({ floater, color, opacity }: { floater: Floater; color: string; opacity: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(
      floater.delay,
      withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [floater.delay, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -20 * t.value }, { rotate: `${8 * t.value}deg` }],
  }));
  return (
    <Animated.View
      style={[styles.floater, { top: floater.top, left: floater.left, right: floater.right, opacity }, style]}>
      <Ionicons name={floater.icon} size={floater.size} color={color} />
    </Animated.View>
  );
}

/** Faint floating race icons; purely decorative (hidden from screen readers, ignores touches). */
export function FloatingIcons({
  color,
  opacity = 0.07,
  count = FLOATERS.length,
}: {
  color: string;
  opacity?: number;
  count?: number;
}) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {FLOATERS.slice(0, count).map((floater) => (
        <FloatingIcon key={floater.icon} floater={floater} color={color} opacity={opacity} />
      ))}
    </View>
  );
}

const GLOW_SIZE = 560;
/** Native fallback: many faint discs stack into a smooth radial falloff. */
const GLOW_RINGS = Array.from({ length: 14 }, (_, i) => GLOW_SIZE * (1 - i / 14));

/** A soft radial glow: a blurred disc on the web, stacked translucent discs on phones. */
function Glow({ color, style }: { color: string; style: ViewStyle }) {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.glow,
          { width: GLOW_SIZE, height: GLOW_SIZE, borderRadius: GLOW_SIZE / 2, backgroundColor: color },
          // react-native-web passes CSS filters through.
          { filter: 'blur(90px)' } as ViewStyle,
          style,
        ]}
      />
    );
  }
  return (
    <View style={[styles.glow, { width: GLOW_SIZE, height: GLOW_SIZE }, style]}>
      {GLOW_RINGS.map((ring) => (
        <View
          key={ring}
          style={[
            styles.ring,
            { width: ring, height: ring, borderRadius: ring / 2, backgroundColor: color, opacity: 0.1 },
          ]}
        />
      ))}
    </View>
  );
}

/** Two soft blue halos behind a screen (the radial glows of the reference design). */
export function Halos() {
  const theme = useTheme();
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Glow color={theme.halo} style={styles.haloTop} />
      <Glow color={theme.haloAlt} style={styles.haloBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  floater: { position: 'absolute' },
  glow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  ring: { position: 'absolute' },
  haloTop: { top: -240, right: -200 },
  haloBottom: { bottom: -280, left: -240 },
});
