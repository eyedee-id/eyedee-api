import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {FileObj, s3CreatePreSignedPost} from "../../../shared/libs/s3";
import code from "../../../shared/libs/code";

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
  try {
    const auth = getAuth(event);
    const data = JSON.parse(event.body) as FileObj;

    const fileExtension = data.extension;
    if (!['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      throw Error(code.input_invalid);
    }
    const fileName = `${auth.user_id}.${fileExtension}`;

    const s3 = await s3CreatePreSignedPost(
      `users/images/profile`,
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
