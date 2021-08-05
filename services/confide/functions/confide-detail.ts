import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel, dynamodbDecodeKeyConfideDetail,
  dynamodbEncodeKeyConfideDetail,
} from '../../../shared/models/confide.model';
import {dynamodbGet} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {getAuth} from "../../../shared/libs/auth";
import code from "../../../shared/libs/code";
import {userGetByUserId} from "../../../shared/functions/user";


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<ConfideModel>> {
  try {

    if (!event.pathParameters.confide_id) {
      throw Error(code.input_invalid);
    }

    const auth = getAuth(event);
    const confideId = event.pathParameters.confide_id;

    const key = dynamodbEncodeKeyConfideDetail({
      confide_id: confideId,
    });
    const dynamodbResult = await dynamodbGet(
      key.pk,
      key.sk
    );

    const unmarshalled = unmarshall(dynamodbResult.Item);
    const confide: ConfideModel = {
      ...dynamodbDecodeKeyConfideDetail({
        pk: unmarshalled.pk,
        sk: unmarshalled.sk,
      }),
      ...unmarshalled
    }

    if (auth.user_id !== confide.user_id && confide.is_anonim) {
      delete confide.user_id;
    }

    if (confide.user_id) {
      const user = await userGetByUserId(confide.user_id);
      confide.username = user.username;
      confide.name_ = user.name_;
    }

    return {
      status: true,
      data: confide,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
