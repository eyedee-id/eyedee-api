import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {FileObj, s3CreatePreSignedPost} from "../../../shared/libs/s3";
import code from "../../../shared/libs/code";

interface UserPhoto extends FileObj {
  photo_type: 'banner' | 'profile';
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
  try {
    const auth = getAuth(event);
    const data = JSON.parse(event.body) as UserPhoto;

    if (!['banner', 'profiles'].includes(data.photo_type)) {
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
