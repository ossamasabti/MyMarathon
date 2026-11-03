import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type ComponentProps } from 'react';
import { Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface CheckMarkProps {
  checked: boolean;
  checkedIcon: IconName;
  uncheckedIcon: IconName;
  checkedColor: string;
  uncheckedColor: string;
  size?: number;
}

/** Checkbox icon that pops (and buzzes on phones) when it becomes checked. */
export function CheckMark({ checked, checkedIcon, uncheckedIcon, checkedColor, uncheckedColor, size = 28 }: CheckMarkProps) {
  const scale = useSharedValue(1);
  const previous = useRef(checked);

  useEffect(() => {
    if (checked && !previous.current) {
      scale.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 220 }));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    previous.current = checked;
  }, [checked, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={checked ? checkedIcon : uncheckedIcon} size={size} color={checked ? checkedColor : uncheckedColor} />
    </Animated.View>
  );
}
