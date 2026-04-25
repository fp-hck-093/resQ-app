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
import { useMutation } from '@apollo/client/react';
import { REGISTER_MUTATION } from '../apollo/mutations.js';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      Alert.alert('Berhasil', data.register || 'Akun berhasil dibuat!', [
        { text: 'Login Sekarang', onPress: () => navigation.replace('Login') },
      ]);
    },
    onError: (error) => {
      Alert.alert('Gagal', error.message);
    },
  });

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!email.trim()) newErrors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Format email tidak valid';
    if (!phone.trim()) newErrors.phone = 'Nomor HP wajib diisi';
    else if (!/^\d{8,15}$/.test(phone.replace(/[\s+-]/g, ''))) newErrors.phone = 'Nomor HP tidak valid';
    if (!password) newErrors.password = 'Password wajib diisi';
    else if (password.length < 5) newErrors.password = 'Password minimal 5 karakter';
    if (!confirmPassword) newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Password tidak cocok';
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
            <Text style={styles.title}>Daftar</Text>
            <Text style={styles.subtitle}>Buat akun untuk meminta bantuan atau menjadi relawan saat dibutuhkan.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Nama lengkap"
              placeholderTextColor="#7c8daa"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
              }}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#7c8daa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
              }}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Nomor HP"
              placeholderTextColor="#7c8daa"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
              }}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Password"
                placeholderTextColor="#7c8daa"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                }}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((current) => !current)}>
                <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Konfirmasi password"
                placeholderTextColor="#7c8daa"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }
                }}
              />
              <Pressable
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword((current) => !current)}
              >
                <Text style={styles.passwordToggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Memproses...' : 'Daftar'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun?</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  decorTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#dbeafe',
    top: -110,
    right: -90,
  },
  decorSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#eff6ff',
    top: 112,
    left: -28,
  },
  decorBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#e8f1ff',
    bottom: -120,
    left: -70,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 26,
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 34,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#2f5d95',
    fontSize: 20,
    fontWeight: '800',
  },
  brandText: {
    color: '#1c304a',
    fontSize: 28,
    fontWeight: '800',
  },
  heading: {
    marginBottom: 26,
  },
  title: {
    color: '#17263b',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },
  subtitle: {
    color: '#607089',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  form: {
    gap: 10,
  },
  input: {
    height: 54,
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#18283c',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  inputError: {
    borderColor: '#e98585',
  },
  errorText: {
    color: '#c24141',
    fontSize: 12,
    marginTop: -4,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 76,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: '#527db2',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3f7fca',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#607089',
    fontSize: 14,
  },
  footerLink: {
    color: '#2f5d95',
    fontSize: 14,
    fontWeight: '800',
  },
});
