import { User } from '../../types/domain';
import { RoleCode } from '../../types/enums';

const MOCK_USERS: Record<string, { user: User; password: string }> = {
  'drone@hoanghai.vn': {
    user: {
      id: 'U001',
      role_code: RoleCode.DRONE_OPERATOR,
      full_name: 'Nguyen Van Drone',
      email: 'drone@hoanghai.vn',
      employee_code: 'NV001',
      must_change_password: false,
      project_ids: ['P001', 'P002'],
      token: 'mock-token-drone-001',
      refresh_token: 'mock-refresh-drone-001',
    },
    password: '1',
  },
  'pm@hoanghai.vn': {
    user: {
      id: 'U002',
      role_code: RoleCode.PROJECT_MANAGER,
      full_name: 'Tran Thi PM',
      email: 'pm@hoanghai.vn',
      employee_code: 'NV002',
      must_change_password: false,
      project_ids: ['P001'],
      token: 'mock-token-pm-001',
      refresh_token: 'mock-refresh-pm-001',
    },
    password: '1',
  },
  'crew@hoanghai.vn': {
    user: {
      id: 'U003',
      role_code: RoleCode.REPAIR_CREW,
      full_name: 'Le Van Crew',
      email: 'crew@hoanghai.vn',
      employee_code: 'NV003',
      must_change_password: false,
      project_ids: ['P001'],
      token: 'mock-token-crew-001',
      refresh_token: 'mock-refresh-crew-001',
    },
    password: '1',
  },
  'sup@hoanghai.vn': {
    user: {
      id: 'U004',
      role_code: RoleCode.SUPERVISOR,
      full_name: 'Pham Van Sup',
      email: 'sup@hoanghai.vn',
      employee_code: 'NV004',
      must_change_password: false,
      project_ids: ['P001'],
      token: 'mock-token-sup-001',
      refresh_token: 'mock-refresh-sup-001',
    },
    password: '1',
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email: string, password: string) {
  await delay(400);
  const entry = MOCK_USERS[email];
  if (!entry || entry.password !== password) {
    throw { response: { status: 401, data: { message: 'Sai tài khoản hoặc mật khẩu' } } };
  }
  return { data: { user: entry.user, token: entry.user.token, refresh_token: entry.user.refresh_token } };
}

export async function refresh(refresh_token: string) {
  await delay(200);
  return { data: { token: `mock-token-refreshed-${Date.now()}` } };
}

export async function changePassword(token: string, old_password: string, new_password: string) {
  await delay(300);
  const entry = Object.values(MOCK_USERS).find((item) => item.user.token === token);
  if (!entry || entry.password !== old_password) {
    throw { response: { status: 400, data: { message: 'Mật khẩu cũ không đúng' } } };
  }
  entry.password = new_password;
  entry.user.must_change_password = false;
  return { data: { ok: true } };
}