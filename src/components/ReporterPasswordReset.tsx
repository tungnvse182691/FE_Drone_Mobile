import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { InputField } from './InputField';
import { typography, spacing } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { bareClient } from '../api/client';
import { clearResetReporterSession, confirmReporterReset, REPORTER_RESET_ACK, reporterResetError, requestReporterReset } from '../api/reporterPasswordReset';

/** Memory-only form. Unmount on dismissal, blur, role/session change. */
export function ReporterPasswordReset({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = useState(''), [otp, setOtp] = useState(''), [password, setPassword] = useState('');
  const [requested, setRequested] = useState(false), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [seconds, setSeconds] = useState(0), [invalid, setInvalid] = useState(false);
  const lock = useRef(false), alive = useRef(true), invalidated = useRef(false);
  const initial = useRef(useAuthStore.getState()), environment = useRef(bareClient.defaults.baseURL);
  const valid = () => alive.current && !invalidated.current && initial.current.user === useAuthStore.getState().user &&
    initial.current.token === useAuthStore.getState().token && initial.current.status === useAuthStore.getState().status && environment.current === bareClient.defaults.baseURL;
  useEffect(() => {
    alive.current = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      if (!valid()) { invalidated.current = true; setInvalid(true); setOtp(''); setPassword(''); setEmail(''); setMessage('Phiên đã thay đổi. Đóng rồi mở lại khôi phục mật khẩu.'); }
    });
    return () => { alive.current = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const run = async (confirm: boolean) => {
    if (lock.current || !valid() || (!confirm && seconds > 0)) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) { setMessage('Vui lòng nhập email hợp lệ.'); return; }
    if (confirm && (!/^[0-9]{6}$/.test(otp) || !password.trim() || password.length > 1024)) { setMessage('Nhập mã gồm 6 chữ số và mật khẩu mới (tối đa 1024 ký tự).'); return; }
    lock.current = true; setBusy(true); setMessage('');
    if (!confirm) { setSeconds(60); setRequested(true); setOtp(''); setPassword(''); }
    try {
      if (confirm) await confirmReporterReset(email, otp, password);
      else await requestReporterReset(email);
      if (!valid()) return;
      if (confirm) {
        setOtp(''); setPassword('');
        clearResetReporterSession(useAuthStore.getState(), initial.current, email);
        onComplete();
      } else setMessage(REPORTER_RESET_ACK);
    } catch (error) { if (valid()) setMessage(reporterResetError(error)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return <View style={{ gap: spacing.md }}>
    <Text style={typography.caption}>Chỉ người phản ánh được tự khôi phục mật khẩu. Nhân viên vui lòng liên hệ quản trị viên.</Text>
    <InputField label="Email người phản ánh" value={email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
      onChangeText={value => { if (!busy && !invalid && !requested) setEmail(value); }} />
    {requested ? <>
      <InputField label="Mã đặt lại mật khẩu" value={otp} keyboardType="number-pad" autoCorrect={false} onChangeText={value => { if (!busy && !invalid) setOtp(value.replace(/[^0-9]/g, '').slice(0, 6)); }} />
      <InputField label="Mật khẩu mới" value={password} secureTextEntry autoCorrect={false} onChangeText={value => { if (!busy && !invalid) setPassword(value); }} />
      <Button variant="primary" title="Đổi mật khẩu" onPress={() => void run(true)} disabled={busy || invalid} loading={busy} />
      <Text style={typography.caption}>Mặc định mã có hiệu lực 10 phút, tối đa 5 lần thử. Máy chủ quyết định giới hạn thực tế.</Text>
    </> : null}
    {message ? <Text accessibilityRole="alert" style={typography.bodyMd}>{message}</Text> : null}
    <Button variant="secondary" title={seconds > 0 ? `Gửi lại sau ${seconds}s` : requested ? 'Gửi mã mới' : 'Gửi mã OTP'} onPress={() => void run(false)} disabled={busy || invalid || seconds > 0} />
    {requested ? <Button variant="secondary" title="Đổi email" disabled={busy || invalid || seconds > 0} onPress={() => { setRequested(false); setOtp(''); setPassword(''); setMessage(''); }} /> : null}
  </View>;
}
