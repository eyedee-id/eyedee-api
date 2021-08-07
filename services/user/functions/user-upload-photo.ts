import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {FileObj, s3CreatePreSignedPost} from "../../../shared/libs/s3";
import code from "../../../shared/libs/code";
import {userUpdate} from "../../../shared/functions/user";

interface UserPhoto extends FileObj {
  photo_type: 'banner' | 'profile';
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
  try {
    const auth = getAuth(event);
    const data = JSON.parse(event.body) as UserPhoto;

    if (!['banner', 'profile'].includes(data.photo_type)) {
      throw Error(code.input_invalid);
    }

    if (!['image/png'].includes(data.type)) { // selalu png
      throw Error(code.input_invalid);
    }

    const fileExtension = data.extension;
    if (!['png'].includes(fileExtension)) { // selalu png
      throw Error(code.input_invalid);
    }
    const fileName = `${auth.user_id}.${fileExtension}`;

    const s3 = await s3CreatePreSignedPost(
      `users/images/${data.photo_type}`,
      fileName,
      data.type,
    )

    const now = +new Date();
    // update user at_updated
    await userUpdate(
      auth.user_id,
      'SET at_updated = :now',
      {
        ':now': now,
      }
    )

    return {
      status: true,
      data: s3,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
