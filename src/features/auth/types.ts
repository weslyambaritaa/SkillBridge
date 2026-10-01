export const USER_ROLES = ["STUDENT", "BUSINESS", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type SelfAssignableRole = Exclude<UserRole, "ADMIN">;

export type Account = {
  id: string;
  created_at: string;
  updated_at: string;
  role: UserRole;
};

export type AuthActionState = {
  message?: string;
  success?: boolean;
};
