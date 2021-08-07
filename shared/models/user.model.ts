import config from "../libs/config";

export interface UserModel {
  username?: string;
  user_id?: string; // sub kalo di AWS cognito
  email?: string;
  name_?: string;

  avatar_url?: string;
  banner_url?: string;

  at_created?: number;
  at_updated?: number;
  at_deleted?: number;
}

export function userPhoto(user: UserModel): UserModel {
  if (!user.at_updated) {
    return {};
  }

  return {
    avatar_url: `https://${config.s3_bucket}.s3.${config.region}.amazonaws.com/users/images/profile/${user.user_id}.png?v=${user.at_updated}`, // always pake .png
    banner_url: `https://${config.s3_bucket}.s3.${config.region}.amazonaws.com/users/images/banner/${user.user_id}.png?v=${user.at_updated}`, // always pake .png
  }
}
