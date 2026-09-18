import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { ROLE_HOMES } from '../src/constants/routes';

export default function RootIndex() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  if (user.must_change_password) {
    return <Redirect href="/(auth)/force-change-password" />;
  }

  return <Redirect href={ROLE_HOMES[user.role_code] as any} />;
}
