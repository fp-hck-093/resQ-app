import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input)
  }
`;

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [sent, setSent] = useState(false);

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD_MUTATION, {
    onCompleted: () => {
      setSent(true);
    },
    onError: (error) => {
      setApiError(error.message);
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = 'Invalid email format';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    void forgotPassword({
      variables: { input: { email: email.trim().toLowerCase() } },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Blue header */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => navigation.replace('Login')}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.backBtnText}>Back to Login</Text>
            </Pressable>

            <View style={styles.logoCard}>
              <Image source={require('../assets/ResQ2.png')} style={styles.logoImage} />
              <Text style={styles.logoCardTitle}>ResQ</Text>
            </View>
          </View>

          {/* Form section */}
          <View style={styles.formSection}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock-reset" size={28} color="#3b5fca" />
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            {sent ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.successBannerTitle}>Email Sent!</Text>
                  <Text style={styles.successBannerText}>
                    Check your inbox or spam folder for the reset link.
                  </Text>
                </View>
              </View>
            ) : null}

            {apiError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'email' && styles.inputWrapFocused,
                  errors.email && styles.inputWrapError,
                ]}
              >
                <MaterialIcons name="email" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((curr) => ({ ...curr, email: undefined }));
                  }}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#3b5fca" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                The reset link is valid for <Text style={styles.infoBold}>15 minutes</Text>. Check your spam folder if you don't see it.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password?</Text>
              <Pressable onPress={() => navigation.replace('Login')}>
                <Text style={styles.footerLink}> Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#3b5fca' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  header: {
    backgroundColor: '#3b5fca',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logoCard: {
    width: 110,
    height: 110,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    gap: 4,
  },
  logoImage: { width: 70, height: 70, resizeMode: 'contain' },
  logoCardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },

  formSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 24 },

  form: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
  },
  inputWrapFocused: { borderColor: '#3b5fca', backgroundColor: '#fff' },
  inputWrapError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  errorText: { color: '#ef4444', fontSize: 12 },

  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#3b5fca',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18 },
  infoBold: { fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#3b5fca', fontSize: 14, fontWeight: '800' },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  successBannerTitle: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  successBannerText: { fontSize: 12, color: '#166534', marginTop: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#dc2626' },
});
