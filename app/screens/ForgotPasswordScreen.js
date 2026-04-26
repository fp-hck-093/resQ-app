import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input)
  }
`;

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD_MUTATION, {
    onCompleted: () => {
      Alert.alert(
        'Email terkirim',
        'Link reset password telah dikirim ke email kamu. Cek inbox atau folder spam.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }],
      );
    },
    onError: (error) => {
      Alert.alert('Gagal', error.message);
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = 'Format email tidak valid';
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
      <View style={styles.decorTop} />
      <View style={styles.decorSmall} />
      <View style={styles.decorBottom} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <Text style={styles.brandText}>resQ</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>Lupa Password</Text>
            <Text style={styles.subtitle}>
              Masukkan email kamu dan kami akan mengirimkan link untuk reset password.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
                errors.email && styles.inputError,
              ]}
              placeholder="nama@email.com"
              placeholderTextColor="#7c8daa"
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
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ingat password?</Text>
            <Pressable onPress={() => navigation.replace('Login')}>
              <Text style={styles.footerLink}> Masuk</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  decorTop: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#dbeafe', top: -110, right: -90,
  },
  decorSmall: {
    position: 'absolute', width: 92, height: 92, borderRadius: 46,
    backgroundColor: '#eff6ff', top: 112, left: -28,
  },
  decorBottom: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#e8f1ff', bottom: -120, left: -70,
  },
  keyboardAvoid: { flex: 1 },
  content: {
    flexGrow: 1, paddingHorizontal: 24, paddingTop: 34,
    paddingBottom: 26, justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoBox: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#2f5d95', fontSize: 20, fontWeight: '800' },
  brandText: { color: '#1c304a', fontSize: 28, fontWeight: '800' },
  heading: { marginBottom: 32 },
  title: { color: '#17263b', fontSize: 42, fontWeight: '800', lineHeight: 48 },
  subtitle: { color: '#607089', fontSize: 16, lineHeight: 24, marginTop: 10 },
  form: { gap: 8 },
  label: { color: '#33465f', fontSize: 14, fontWeight: '700', marginTop: 8 },
  input: {
    height: 56, backgroundColor: '#f8fbff', borderRadius: 16,
    paddingHorizontal: 16, color: '#18283c', fontSize: 16,
    borderWidth: 1, borderColor: '#dce8f8',
  },
  inputFocused: { borderColor: '#7aa5dc', backgroundColor: '#ffffff' },
  inputError: { borderColor: '#e98585' },
  errorText: { color: '#c24141', fontSize: 12 },
  primaryButton: {
    height: 56, borderRadius: 16, backgroundColor: '#3f7fca',
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  footerText: { color: '#607089', fontSize: 14 },
  footerLink: { color: '#2f5d95', fontSize: 14, fontWeight: '800' },
});
