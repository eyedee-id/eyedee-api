import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel,
  dynamodbDecodeKeyUserPublicConfide,
  dynamodbEncodeKeyUserPublicConfide,
} from '../../../shared/models/confide.model';
import {dynamodbQuery, dynamodbQueryLimit} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<Array<ConfideModel>>> {
  try {
    let lastKey = undefined;
    const params = event.queryStringParameters;

    if (params && params.at_created && params.confide_id) {
      lastKey = dynamodbEncodeKeyUserPublicConfide({
        user_id: params.user_id,
        at_created: +params.at_created,
        confide_id: params.confide_id,
      });
    }

    let key = {pk: '', sk: ''};
    key = dynamodbEncodeKeyUserPublicConfide({
      user_id: params.user_id,
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
        let decodedKey: ConfideModel = {};

        decodedKey = dynamodbDecodeKeyUserPublicConfide({
          pk: unmarshalled.pk,
          sk: unmarshalled.sk,
        })

        if (unmarshalled.is_anonim) {
          delete unmarshalled.user_id;
        }

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
