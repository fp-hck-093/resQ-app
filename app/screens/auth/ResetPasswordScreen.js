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

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

export default function ResetPasswordScreen({ route, navigation }) {
  const { token, id } = route.params ?? {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION, {
    onCompleted: () => {
      navigation.replace('Login');
    },
    onError: (error) => {
      setApiError(error.message);
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!newPassword) nextErrors.newPassword = 'New password is required';
    else if (newPassword.length < 6) nextErrors.newPassword = 'Minimum 6 characters';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!token || !id) {
      setApiError('This reset link is invalid. Please request a new one.');
      return;
    }
    if (!validate()) return;
    void resetPassword({
      variables: { input: { id, token, newPassword } },
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
            <View style={styles.logoCard}>
              <Image source={require('../../assets/ResQ2.png')} style={styles.logoImage} />
              <Text style={styles.logoCardTitle}>ResQ</Text>
            </View>
          </View>

          {/* Form section */}
          <View style={styles.formSection}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="lock" size={28} color="#3b5fca" />
            </View>

            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Your new password must be different from your previous password.
            </Text>

            {apiError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>New Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'new' && styles.inputWrapFocused,
                  errors.newPassword && styles.inputWrapError,
                ]}
              >
                <MaterialIcons name="lock-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onFocus={() => setFocusedField('new')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword) setErrors((curr) => ({ ...curr, newPassword: undefined }));
                  }}
                />
                <Pressable onPress={() => setShowNew((curr) => !curr)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
              {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}

              <Text style={styles.label}>Confirm New Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'confirm' && styles.inputWrapFocused,
                  errors.confirmPassword && styles.inputWrapError,
                ]}
              >
                <MaterialIcons name="lock-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors((curr) => ({ ...curr, confirmPassword: undefined }));
                  }}
                />
                <Pressable onPress={() => setShowConfirm((curr) => !curr)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}

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
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.secureBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" style={styles.secureIcon} />
              <Text style={styles.secureText}>
                <Text style={styles.secureBold}>Secure: </Text>
                Your new password is encrypted and stored safely.
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
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCard: {
    width: 120,
    height: 120,
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
  logoImage: { width: 80, height: 80, resizeMode: 'contain' },
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
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 6, marginTop: 4 },
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
  eyeBtn: { padding: 4 },
  errorText: { color: '#ef4444', fontSize: 12 },

  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#3b5fca',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  secureBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    marginTop: 20,
    gap: 8,
  },
  secureIcon: { marginTop: 1 },
  secureText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },
  secureBold: { fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#3b5fca', fontSize: 14, fontWeight: '800' },

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
