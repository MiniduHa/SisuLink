import React from 'react';
import { View, StyleSheet, Dimensions, DimensionValue } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';

const { width, height } = Dimensions.get('window');

const WatermarkOverlay = () => {
  // Define school-related icons
  const icons = [
    { name: 'graduation-cap', library: 'FontAwesome6' },
    { name: 'book-open', library: 'FontAwesome6' },
    { name: 'pencil', library: 'FontAwesome6' },
    { name: 'school', library: 'FontAwesome6' },
    { name: 'apple-whole', library: 'FontAwesome6' },
    { name: 'bell', library: 'FontAwesome6' },
    { name: 'microscope', library: 'FontAwesome6' },
    { name: 'chalkboard-user', library: 'FontAwesome6' },
    { name: 'notebook-outline', library: 'MaterialCommunityIcons' },
    { name: 'calculator', library: 'FontAwesome6' },
  ];

  // Create a scattered pattern
  const watermarkItems: { icon: any, top: DimensionValue, left: DimensionValue, rotate: string }[] = [
    { icon: icons[0], top: '10%', left: '15%', rotate: '15deg' },
    { icon: icons[1], top: '25%', left: '70%', rotate: '-20deg' },
    { icon: icons[2], top: '45%', left: '10%', rotate: '10deg' },
    { icon: icons[3], top: '60%', left: '80%', rotate: '-15deg' },
    { icon: icons[4], top: '80%', left: '20%', rotate: '25deg' },
    { icon: icons[5], top: '15%', left: '50%', rotate: '-10deg' },
    { icon: icons[6], top: '40%', left: '60%', rotate: '30deg' },
    { icon: icons[7], top: '70%', left: '40%', rotate: '-25deg' },
    { icon: icons[8], top: '90%', left: '75%', rotate: '5deg' },
    { icon: icons[9], top: '55%', left: '25%', rotate: '20deg' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {watermarkItems.map((item, index) => (
        <View 
          key={index} 
          style={[
            styles.watermarkItem, 
            { 
              top: item.top, 
              left: item.left, 
              transform: [{ rotate: item.rotate }] 
            }
          ]}
        >
          {item.icon.library === 'FontAwesome6' ? (
            <FontAwesome6 name={item.icon.name as any} size={60} color="#CBD5E1" />
          ) : (
            <MaterialCommunityIcons name={item.icon.name as any} size={65} color="#CBD5E1" />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  watermarkItem: {
    position: 'absolute',
    opacity: 0.2, // Increased opacity as requested
  },
});



export default WatermarkOverlay;
