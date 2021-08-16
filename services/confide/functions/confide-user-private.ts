import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel, dynamodbDecodeKeyUserPrivateConfide,
  dynamodbEncodeKeyUserPrivateConfide,
} from '../../../shared/models/confide.model';
import {dynamodbQuery, dynamodbQueryLimit} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {getAuth} from "../../../shared/libs/auth";


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<Array<ConfideModel>>> {
  try {
    const auth = getAuth(event);

    let lastKey = undefined;
    const params = event.queryStringParameters;

    if (params && params.order_id) {
      lastKey = dynamodbEncodeKeyUserPrivateConfide({
        user_id: auth.user_id,
        order_id: +params.order_id,
      });
    }

    let key = {pk: '', sk: ''};
    key = dynamodbEncodeKeyUserPrivateConfide({
      user_id: auth.user_id,
    });

    const dynamodbResult = await dynamodbQuery({
      pk: key.pk,
      sk: key.sk,
      sk_condition: 'begins_with',
      sort: 'desc',
      limit: dynamodbQueryLimit,
      last_key: lastKey,
    });

    const confides = dynamodbResult.Items
      .map(i => {
        const unmarshalled = unmarshall(i);

        const decodedKey = dynamodbDecodeKeyUserPrivateConfide({
          pk: unmarshalled.pk,
          sk: unmarshalled.sk,
        })

        return {
          ...unmarshalled,
          ...decodedKey,
          pk: undefined,
          sk: undefined,
        }
      });

    return {
      status: true,
      data: confides,
      meta: {
        limit: dynamodbQueryLimit,
      },
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
