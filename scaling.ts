import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline sizes are based on standard iPhone 11/14 screen
const guidelineBaseWidth = 375; 

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;