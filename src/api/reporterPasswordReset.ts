import { bareClient } from './client';
import { extractProblemCode } from './authApi';

export const REPORTER_RESET_ACK = 'Nếu tài khoản đủ điều kiện, mã sẽ được gửi về email đã đăng ký.';
// Explicitly omit ambient credentials, including same-origin Web cookies. No interceptors/retries.
const anonymous = () => ({ adapter: 'fetch' as const, withCredentials: false,
  fetchOptions: { credentials: 'omit' as RequestCredentials },
  headers: { Authorization: null, Cookie: null, 'X-CSRF-TOKEN': null, 'Idempotency-Key': null } });
const emailValue = (email: string) => {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw Error('reset_email_invalid');
  return value;
};
export async function requestReporterReset(email: string): Promise<void> {
  const response = await bareClient.post('/auth/reporter/password-reset/request', { email: emailValue(email) }, anonymous());
  if (response.status !== 202) throw Error('reset_unexpected_status');
}
export async function confirmReporterReset(email: string, otp: string, newPassword: string): Promise<void> {
  if (!/^[0-9]{6}$/.test(otp) || !newPassword.trim() || newPassword.length > 1024) throw Error('reset_input_invalid');
  const response = await bareClient.post('/auth/reporter/password-reset/confirm', { email: emailValue(email), otp, newPassword }, anonymous());
  if (response.status !== 204) throw Error('reset_unexpected_status');
}
export function reporterResetError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const code = extractProblemCode(error);
  if (status === 400 && code === 'invalid_reset_otp') return 'Mã không hợp lệ, hết hạn hoặc không còn được chấp nhận. Bạn có thể yêu cầu mã mới.';
  if (status === 400 && code === 'validation_error') return 'Kiểm tra email, mã gồm 6 chữ số và mật khẩu mới.';
  if (status === 422 && code === 'password_policy_failed') return 'Mật khẩu chưa đạt chính sách máy chủ. Nhập mật khẩu khác rồi xác nhận lại nếu mã còn hiệu lực.';
  return 'Chưa xác nhận được kết quả. Không tự động gửi lại. Nếu đang đổi mật khẩu, hãy thử đăng nhập bằng mật khẩu mới trước khi yêu cầu mã khác.';
}
type ResetSession = { user: { id: string; role_code: string; phone_or_email: string } | null; token: string | null; logout: () => void };
/** Synchronous identity check: never sign out another account, or remove offline data. */
export function clearResetReporterSession(live: ResetSession, captured: ResetSession, email: string): boolean {
  if (live.user !== captured.user || live.token !== captured.token || live.user?.role_code !== 'REPORTER' ||
      live.user.phone_or_email.trim().toLowerCase() !== email.trim().toLowerCase()) return false;
  live.logout();
  return true;
}
