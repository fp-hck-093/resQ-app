import React, { useState } from 'react';
import {
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

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input)
  }
`;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: () => {
      navigation.replace('Login');
    },
    onError: (error) => {
      setApiError(error.message);
    },
  });

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{8,15}$/.test(phone.replace(/[\s+-]/g, ''))) newErrors.phone = 'Invalid phone number';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Minimum 8 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreedToTerms) newErrors.terms = 'You must agree to the Terms of Service';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) return;
    void register({
      variables: {
        input: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        },
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top nav bar */}
      <View style={styles.navBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.replace('Login')}>
          <Ionicons name="arrow-back" size={16} color="#fff" />
          <Text style={styles.backBtnText}>Back to Login</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Fill in your details to get started</Text>

            {apiError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              {/* Full Name */}
              <Text style={styles.label}>Full Name</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'name' && styles.inputWrapFocused,
                  errors.name && styles.inputWrapError,
                ]}
              >
                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors((curr) => ({ ...curr, name: undefined }));
                  }}
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

              {/* Email */}
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

              {/* Phone */}
              <Text style={styles.label}>Phone Number</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'phone' && styles.inputWrapFocused,
                  errors.phone && styles.inputWrapError,
                ]}
              >
                <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+62 812 3456 7890"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={phone}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors((curr) => ({ ...curr, phone: undefined }));
                  }}
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'password' && styles.inputWrapFocused,
                  errors.password && styles.inputWrapError,
                ]}
              >
                <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a strong password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((curr) => ({ ...curr, password: undefined }));
                  }}
                />
                <Pressable onPress={() => setShowPassword((curr) => !curr)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
              <Text style={styles.hintText}>Must be at least 8 characters with numbers and symbols</Text>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              {/* Confirm Password */}
              <Text style={styles.label}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'confirm' && styles.inputWrapFocused,
                  errors.confirmPassword && styles.inputWrapError,
                ]}
              >
                <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors((curr) => ({ ...curr, confirmPassword: undefined }));
                  }}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword((curr) => !curr)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}

              {/* Terms checkbox */}
              <Pressable
                style={styles.termsRow}
                onPress={() => {
                  setAgreedToTerms((curr) => !curr);
                  if (errors.terms) setErrors((curr) => ({ ...curr, terms: undefined }));
                }}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </Pressable>
              {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating account...' : 'Create Account  →'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => navigation.replace('Login')}>
                <Text style={styles.footerLink}> Sign In</Text>
              </Pressable>
            </View>

            <View style={styles.secureBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" style={styles.secureIcon} />
              <Text style={styles.secureText}>
                <Text style={styles.secureBold}>Secure &amp; Private: </Text>
                Your data is encrypted and never shared with third parties.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#3b5fca' },
  navBar: {
    backgroundColor: '#3b5fca',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  formSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 8 },

  form: { gap: 2 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputWrapFocused: { borderColor: '#3b5fca', backgroundColor: '#fff' },
  inputWrapError: { borderColor: '#ef4444' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#0f172a' },
  eyeBtn: { padding: 4 },
  hintText: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  errorText: { color: '#ef4444', fontSize: 11, marginTop: 1 },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#3b5fca',
    borderColor: '#3b5fca',
  },
  termsText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
  termsLink: { color: '#3b5fca', fontWeight: '700' },

  primaryButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#3b5fca',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: { color: '#64748b', fontSize: 13 },
  footerLink: { color: '#3b5fca', fontSize: 13, fontWeight: '800' },

  secureBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 10,
    marginTop: 20,
    gap: 10,
  },
  secureIcon: { marginTop: 1 },
  secureText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },
  secureBold: { fontWeight: '700' },

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
    marginBottom: 6,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: '#dc2626' },
});
