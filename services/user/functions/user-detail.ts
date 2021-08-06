import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import code from "../../../shared/libs/code";
import {userGetByUsername} from "../../../shared/functions/user";
import config from "../../../shared/libs/config";

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
  try {

    if (!event.pathParameters.username) {
      throw Error(code.input_invalid);
    }

    const auth = getAuth(event);
    const username = event.pathParameters.username;

    const user = await userGetByUsername(username);

    user.avatar_url = `https://${config.s3_bucket}.s3.${config.region}.amazonaws.com/users/images/profile/${user.user_id}.png`; // always pake .png
    user.banner_url = `https://${config.s3_bucket}.s3.${config.region}.amazonaws.com/users/images/banner/${user.user_id}.png`; // always pake .png

    // hide sensitive data dari user lainnya
    if (user.user_id !== auth.user_id) {
      user.email = undefined;
    }

    return {
      status: true,
      data: user,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
