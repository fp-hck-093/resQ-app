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

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION, {
    onCompleted: () => {
      Alert.alert(
        'Berhasil',
        'Password kamu berhasil direset. Silakan masuk dengan password baru.',
        [{ text: 'Masuk', onPress: () => navigation.replace('Login') }],
      );
    },
    onError: (error) => {
      Alert.alert('Gagal', error.message);
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!newPassword) nextErrors.newPassword = 'Password baru wajib diisi';
    else if (newPassword.length < 6) nextErrors.newPassword = 'Minimal 6 karakter';
    if (!confirmPassword) nextErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    else if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Password tidak cocok';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!token || !id) {
      Alert.alert('Error', 'Link reset tidak valid. Minta link baru.');
      return;
    }
    if (!validate()) return;
    void resetPassword({
      variables: { input: { id, token, newPassword } },
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
            <Text style={styles.title}>Password Baru</Text>
            <Text style={styles.subtitle}>
              Buat password baru untuk akun resQ kamu.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Password Baru</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  focusedField === 'new' && styles.inputFocused,
                  errors.newPassword && styles.inputError,
                ]}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#7c8daa"
                secureTextEntry={!showNew}
                value={newPassword}
                onFocus={() => setFocusedField('new')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors((curr) => ({ ...curr, newPassword: undefined }));
                }}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowNew((curr) => !curr)}>
                <Text style={styles.passwordToggleText}>{showNew ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}

            <Text style={styles.label}>Konfirmasi Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  focusedField === 'confirm' && styles.inputFocused,
                  errors.confirmPassword && styles.inputError,
                ]}
                placeholder="Ulangi password baru"
                placeholderTextColor="#7c8daa"
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
              <Pressable style={styles.passwordToggle} onPress={() => setShowConfirm((curr) => !curr)}>
                <Text style={styles.passwordToggleText}>{showConfirm ? 'Hide' : 'Show'}</Text>
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
                {loading ? 'Memproses...' : 'Reset Password'}
              </Text>
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
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 76 },
  passwordToggle: {
    position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center',
  },
  passwordToggleText: { color: '#527db2', fontSize: 13, fontWeight: '800' },
  primaryButton: {
    height: 56, borderRadius: 16, backgroundColor: '#3f7fca',
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
