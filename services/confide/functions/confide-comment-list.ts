import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {dynamodbQuery} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {userListByUserIds} from "../../../shared/functions/user";
import {userPhoto} from "../../../shared/models/user.model";
import {
  ConfideCommentModel,
  dynamodbDecodeKeyConfideComment,
  dynamodbEncodeKeyConfideComment
} from "../../../shared/models/confide-comment.model";


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<Array<ConfideCommentModel>>> {
  try {

    const confideId = event.pathParameters.confide_id;

    let lastKey = undefined;
    const params = event.queryStringParameters;
    if (params && params.at_created && params.comment_id) {
      lastKey = dynamodbEncodeKeyConfideComment({
        confide_id: confideId,
        at_created: +params.at_created,
        comment_id: params.comment_id,
      });
    }

    const key = dynamodbEncodeKeyConfideComment({
      confide_id: confideId,
    });
    const dynamodbResult = await dynamodbQuery({
      pk: key.pk,
      sk: key.sk,
      sk_condition: 'begins_with',
      sort: 'desc',
      limit: 10,
      last_key: lastKey,
    });

    const userIds = {};
    let comments = dynamodbResult.Items
      .map(i => {
        const unmarshalled = unmarshall(i);
        const decodedKey = dynamodbDecodeKeyConfideComment({
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

      comments = comments
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
      data: comments,
      meta: dynamodbResult.LastEvaluatedKey,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
