import { useWindowDimensions } from 'react-native';

export const SIDEBAR_WIDTH = 252;
export const DESKTOP_BREAKPOINT = 900;

export function useDesktopLayout() {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}
