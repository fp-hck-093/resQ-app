import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const logoSlide = useRef(new Animated.Value(80)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo slide up + fade in
      Animated.parallel([
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),

      // Text fade in
      Animated.timing(textFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // Tagline fade in
      Animated.timing(taglineFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),

      // Progress bar
      Animated.timing(progressWidth, {
        toValue: width * 0.5,
        duration: 900,
        useNativeDriver: false,
      }),

      // Hold sebentar
      Animated.delay(300),

      // Fade out seluruh screen
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.replace('Login');
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <LinearGradient
        colors={['#1a2f7a', '#2347a8', '#3b5fca', '#5b7ee5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background decoration circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
        <View style={styles.circleMid} />

        {/* Logo + Text */}
        <View style={styles.centerContent}>
          <Animated.View style={{
            opacity: logoFade,
            transform: [{ translateY: logoSlide }],
          }}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/ResQ2.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.Text style={[styles.appName, { opacity: textFade }]}>
            ResQ
          </Animated.Text>

          <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
            CONNECTING HELP{'\n'}When It Matters Most
          </Animated.Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Decoration circles
  circleTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circleMid: {
    position: 'absolute',
    top: height * 0.3,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  // Center content
  centerContent: { alignItems: 'center' },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
    marginBottom: 24,
  },
  logo: { width: 90, height: 90 },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // Progress bar
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  progressTrack: {
    width: width * 0.5,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});