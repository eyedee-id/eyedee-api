import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {nanoid} from 'nanoid';
import {
  ConfideModel, dynamodbDecodeKeyExploreConfide, dynamodbDecodeKeyUserPrivateConfide, dynamodbEncodeKeyConfideDetail,
  dynamodbEncodeKeyExploreConfide, dynamodbEncodeKeyHashtagConfide, dynamodbEncodeKeyUserPrivateConfide,
  dynamodbEncodeKeyUserPublicConfide
} from '../../../shared/models/confide.model';
import {
  validateParameterBoolean,
  validateParameterNumber,
  validateParameterString
} from '../../../shared/libs/validation';
import code from '../../../shared/libs/code';
import {
  dynamodbBatchWrite,
  dynamodbConvertPutRequestItem,
  dynamodbQuery,
  dynamodbQueryLimit
} from '../../../shared/libs/dynamodb';

import {IoTDataPlaneClient, PublishCommand} from "@aws-sdk/client-iot-data-plane";
import config from "../../../shared/libs/config";
import {fromUtf8} from "@aws-sdk/util-utf8-node";
import {userGetByUserId} from "../../../shared/functions/user";
import {userPhoto} from "../../../shared/models/user.model";
import {unmarshall} from "@aws-sdk/util-dynamodb";

function validateParams(data: any): { public: { is_anonim, text, at_created?, confide_id? }, private?: { nonce, message } } {
  try {
    data = JSON.parse(data);

    if (!data.public) {
      throw Error(code.input_invalid);
    }

    const text = validateParameterString(data.public.text, true);
    const isAnonim = validateParameterBoolean(data.public.is_anonim, true);

    if (
      text === false
      || text.length < 5
      || text.length > 3000
      || isAnonim === null
      || isAnonim === undefined
    ) {
      throw Error(code.input_invalid);
    }

    if (isAnonim === true) {
      if (!data.private) {
        throw Error(code.input_invalid);
      }

      const atCreated = validateParameterNumber(data.public.at_created, true);
      const confideId = validateParameterString(data.public.confide_id, true);
      const nonce = validateParameterString(data.private.nonce, true);
      const message = validateParameterString(data.private.message, true);

      return {
        public: {
          at_created: atCreated,
          confide_id: confideId,
          text,
          is_anonim: isAnonim,
        },
        private: {
          nonce,
          message,
        }
      };
    }

    return {
      public: {
        text,
        is_anonim: isAnonim,
      },
    };
  } catch (e) {
    throw Error(code.input_invalid);
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<ConfideModel>> {
  try {

    const params = validateParams(event.body);

    const auth = getAuth(event);

    const confide = {
      user_id: auth.user_id,
      ...((params.public.is_anonim) ? {
        at_created: params.public.at_created,
        confide_id: params.public.confide_id,
      } : {
        at_created: +(new Date()),
        confide_id: nanoid(32),
      }),
    };

    let dynamodbHashtagItems = [];
    let hashtags: null | Array<string> = params.public.text.match(/#[\p{L}]+/ugi);
    if (hashtags) {
      hashtags = [
        ...new Set(
          hashtags.map(i => i.replace('#', '').toLowerCase())
        )
      ];

      dynamodbHashtagItems = hashtags.map(hashtag => {
        return dynamodbConvertPutRequestItem({
          ...dynamodbEncodeKeyHashtagConfide(hashtag, confide),
          ...((params.public.is_anonim) ? {} : {
            user_id: auth.user_id,
          }),
          total_comment: 0,
          is_anonim: params.public.is_anonim,
          text: params.public.text,
        })
      })
    }

    const items = [

      /**
       * buat detail confide
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyConfideDetail(confide),
        ...((params.public.is_anonim) ? {} : {
          user_id: auth.user_id,
        }),
        at_created: confide.at_created,
        total_comment: 0,
        is_anonim: params.public.is_anonim,
        text: params.public.text,
        hashtags: hashtags,
      }),

      /**
       * buat view explore
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyExploreConfide(confide),
        ...((params.public.is_anonim) ? {} : {
          user_id: auth.user_id,
        }),
        total_comment: 0,
        is_anonim: params.public.is_anonim,
        text: params.public.text,
      }),


      ...dynamodbHashtagItems,

      //@todo: pattern lainnya
    ];

    if (params.public.is_anonim !== true) {
      items.push(
        /**
         * buat view user -secara public
         */
        dynamodbConvertPutRequestItem({
          ...dynamodbEncodeKeyUserPublicConfide(confide),
          total_comment: 0,
          text: params.public.text,
        }),
      )
    } else {

      // ambil user confides order_id terakhir, terus di increment & ++
      const userPrivateConfideKey = dynamodbEncodeKeyUserPrivateConfide({
        user_id: auth.user_id,
      })
      const dynamodbResult = await dynamodbQuery({
        pk: userPrivateConfideKey.pk,
        sk: userPrivateConfideKey.sk,
        sk_condition: 'begins_with',
        sort: 'desc',
        limit: 1,
      });

      let orderId = 1;
      if (dynamodbResult.Count > 0) {
        const unmarshalled = unmarshall(dynamodbResult.Items[0]);
        const decodedKey = dynamodbDecodeKeyUserPrivateConfide({
          pk: unmarshalled.pk,
          sk: unmarshalled.sk,
        });
        if (decodedKey.order_id) {
          orderId = decodedKey.order_id + 1;
        }
      }


      items.push(
        /**
         * buat view user -secara public
         */
        dynamodbConvertPutRequestItem({
          ...dynamodbEncodeKeyUserPrivateConfide({
            user_id: auth.user_id,
            order_id: orderId,
          }),
          message: params.private.message,
          nonce: params.private.nonce,
        }),
      )
    }

    await dynamodbBatchWrite(items);

    const user = await userGetByUserId(auth.user_id);
    // @TODO: ini kedepannya pakai SQS
    const payload: any = [
      {
        at_created: confide.at_created,
        ...((params.public.is_anonim) ? {} : {
          user_id: auth.user_id,
          username: user.username,
          name_: user.name_,
          ...userPhoto(user),
        }),
        total_comment: 0,
        is_anonim: params.public.is_anonim,
        text: params.public.text,
      }
    ];
    const iotClient = new IoTDataPlaneClient(config);
    const iotCommand = new PublishCommand({
      qos: 0,
      topic: '/confides',
      payload: fromUtf8(JSON.stringify(payload)),
    });
    await iotClient.send(iotCommand);


    return {
      status: true,
      data: null,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
