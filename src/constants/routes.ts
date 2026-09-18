import { RoleCode } from '../types/enums';

export const ROLE_HOMES: Record<RoleCode, string> = {
  [RoleCode.DRONE_OPERATOR]: '/(drone)/home',
  [RoleCode.REPAIR_CREW]: '/(crew)/home',
  [RoleCode.PROJECT_MANAGER]: '/(pm)/home',
  [RoleCode.SUPERVISOR]: '/(sup)/home',
};
