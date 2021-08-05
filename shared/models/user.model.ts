export interface UserModel {
  username?: string;
  user_id?: string; // sub kalo di AWS cognito
  email?: string;
  name_?: string;

  at_created?: number;
  at_updated?: number;
  at_deleted?: number;
}
