import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel,
  dynamodbDecodeKeyConfideDetail,
  dynamodbEncodeKeyConfideDetail,
  dynamodbEncodeKeyExploreConfide, dynamodbEncodeKeyHashtagConfide,
  dynamodbEncodeKeyUserPrivateConfide,
  dynamodbEncodeKeyUserPublicConfide,
} from '../../../shared/models/confide.model';
import {
  dynamodbBatchWrite,
  dynamodbConvertPutRequestItem,
  dynamodbGet,
  dynamodbUpdate
} from '../../../shared/libs/dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import {getAuth} from "../../../shared/libs/auth";
import code from "../../../shared/libs/code";
import {validateParameterBoolean, validateParameterString} from "../../../shared/libs/validation";
import {nanoid} from "nanoid";
import {ConfideCommentModel, dynamodbEncodeKeyConfideComment} from "../../../shared/models/confide-comment.model";


function validateParams(data: any) {
  try {
    data = JSON.parse(data);

    const text = validateParameterString(data.text, true);
    const isAnonim = validateParameterBoolean(data.is_anonim, true);

    if (
      text === false
      || text.length < 5
      || text.length > 3000
      || isAnonim === null
      || isAnonim === undefined
    ) {
      throw Error(code.input_invalid);
    }

    return {
      text,
      is_anonim: isAnonim,
    };
  } catch (e) {
    throw Error(code.input_invalid);
  }
}

async function confideDetail(confideId: string) {

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
  };

  return confide;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<ConfideCommentModel>> {
  try {

    if (!event.pathParameters.confide_id) {
      throw Error(code.input_invalid);
    }

    const auth = getAuth(event);
    const params = validateParams(event.body);
    const confideId = event.pathParameters.confide_id;

    const confide = await confideDetail(confideId);

    const now = +new Date();
    const comment: ConfideCommentModel = {
      comment_id: nanoid(32),
      confide_id: confide.confide_id,
      at_created: now,
    };

    // disable hashtag dalam di confide-comment
    // let dynamodbHashtagItems = [];
    // let hashtags: null | Array<string> = params.text.match(/#[\p{L}]+/ugi);
    // if (hashtags) {
    //   hashtags = [
    //     ...new Set(
    //       hashtags.map(i => i.replace('#', '').toLowerCase())
    //     )
    //   ];
    //
    //   dynamodbHashtagItems = hashtags.map(hashtag => {
    //     return dynamodbConvertPutRequestItem({
    //       ...dynamodbEncodeKeyHashtagConfide(hashtag, confide),
    //       ...((params.is_anonim) ? {} : {
    //         user_id: auth.user_id,
    //       }),
    //       total_comment: 0,
    //       is_anonim: params.is_anonim,
    //       text: params.text,
    //     })
    //   })
    // }

    const items = [
      /**
       * buat public comment
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyConfideComment(comment),
        ...((params.is_anonim) ? {} : {
          user_id: auth.user_id,
        }),
        is_anonim: params.is_anonim,
        text: params.text,
        // hashtags: hashtags,
      }),

    ];

    await dynamodbBatchWrite(items);

    // @TODO:
    // lempar ke SQS fifo
    // & update total comments di data confide

    const confideExploreKey = dynamodbEncodeKeyExploreConfide(confide);
    await dynamodbUpdate(
      confideExploreKey.pk,
      confideExploreKey.sk,
      'SET total_comment = if_not_exists(total_comment, :total_comment_default) + :increment',
      {
        ':increment': 1,
        ':total_comment_default': 0,
      }
    )

    const confideDetailKey = dynamodbEncodeKeyConfideDetail(confide);
    await dynamodbUpdate(
      confideDetailKey.pk,
      confideDetailKey.sk,
      'SET total_comment = if_not_exists(total_comment, :total_comment_default) + :increment',
      {
        ':increment': 1,
        ':total_comment_default': 0,
      }
    )

    if (confide.hashtags && confide.hashtags.length > 0) {
      for (const hashtag of confide.hashtags) {
        const confideHashtagKey = dynamodbEncodeKeyHashtagConfide(hashtag, confide);
        await dynamodbUpdate(
          confideHashtagKey.pk,
          confideHashtagKey.sk,
          'SET total_comment = if_not_exists(total_comment, :total_comment_default) + :increment',
          {
            ':increment': 1,
            ':total_comment_default': 0,
          }
        )
      }
    }

    if (confide.user_id) {
      const confideUserPublicKey = dynamodbEncodeKeyUserPublicConfide(confide);
      await dynamodbUpdate(
        confideUserPublicKey.pk,
        confideUserPublicKey.sk,
        'SET total_comment = if_not_exists(total_comment, :total_comment_default) + :increment',
        {
          ':increment': 1,
          ':total_comment_default': 0,
        }
      )

      const confideUserPrivateKey = dynamodbEncodeKeyUserPrivateConfide(confide);
      await dynamodbUpdate(
        confideUserPrivateKey.pk,
        confideUserPrivateKey.sk,
        'SET total_comment = if_not_exists(total_comment, :total_comment_default) + :increment',
        {
          ':increment': 1,
          ':total_comment_default': 0,
        }
      )
    }


    return {
      status: true,
      data: comment,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
