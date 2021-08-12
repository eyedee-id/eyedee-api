import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel, dynamodbDecodeKeyExploreConfide, dynamodbEncodeKeyExploreConfide,
} from '../../../shared/models/confide.model';
import {dynamodbQuery, dynamodbQueryLimit} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {userListByUserIds} from "../../../shared/functions/user";
import {userPhoto} from "../../../shared/models/user.model";


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<Array<ConfideModel>>> {
  try {
    let lastKey = undefined;
    const params = event.queryStringParameters;
    if (params && params.at_created && params.confide_id) {
      lastKey = dynamodbEncodeKeyExploreConfide({
        at_created: +params.at_created,
        confide_id: params.confide_id,
      });
    }

    const key = dynamodbEncodeKeyExploreConfide({});
    const dynamodbResult = await dynamodbQuery({
      pk: key.pk,
      sk: key.sk,
      sk_condition: 'begins_with',
      sort: 'desc',
      limit: dynamodbQueryLimit,
      last_key: lastKey,
    });

    const userIds = {};
    let confides = dynamodbResult.Items
      .map(i => {
        const unmarshalled = unmarshall(i);
        const decodedKey = dynamodbDecodeKeyExploreConfide({
          pk: unmarshalled.pk,
          sk: unmarshalled.sk,
        })
        if (unmarshalled.is_anonim) {
          delete unmarshalled.user_id;
        } else {

          userIds[unmarshalled.user_id] = null;
        }
        return {
          ...unmarshalled,
          ...decodedKey,
          pk: undefined,
          sk: undefined,
        }
      });

    if (Object.keys(userIds).length > 0) {
      const users = await userListByUserIds(Object.keys(userIds))
      const usersObj = Object.assign({},
        ...users.map(item => ({[item.user_id]: item}),
        ));

      confides = confides
        .map(i => {

          if (!i.is_anonim) {
            const user = usersObj[i.user_id];
            return {
              ...i,
              username: user.username,
              name_: user.name_,
              ...userPhoto(user),
            }
          }

          return i;
        })
    }

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
