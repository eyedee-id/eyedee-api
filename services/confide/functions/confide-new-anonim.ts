import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {
  ConfideModel, dynamodbDecodeKeyUserPrivateConfide, dynamodbEncodeKeyConfideDetail,
  dynamodbEncodeKeyExploreConfide, dynamodbEncodeKeyHashtagConfide, dynamodbEncodeKeyUserPrivateConfide,
} from '../../../shared/models/confide.model';
import {
  validateParameterNumber,
  validateParameterString
} from '../../../shared/libs/validation';
import code from '../../../shared/libs/code';
import {
  dynamodbBatchWrite,
  dynamodbConvertPutRequestItem,
  dynamodbQuery,
} from '../../../shared/libs/dynamodb';

import {IoTDataPlaneClient, PublishCommand} from "@aws-sdk/client-iot-data-plane";
import config from "../../../shared/libs/config";
import {fromUtf8} from "@aws-sdk/util-utf8-node";
import {unmarshall} from "@aws-sdk/util-dynamodb";

function validateParams(data: any): { public: { text, at_created?, confide_id? }, private?: { user_id, type, message } } {
  try {
    data = JSON.parse(data);

    if (!data.public || !data.private) {
      throw Error(code.input_invalid);
    }

    const text = validateParameterString(data.public.text, true);

    if (
      text === false
      || text.length < 5
      || text.length > 3000
    ) {
      throw Error(code.input_invalid);
    }

    // private
    const atCreated = validateParameterNumber(data.public.at_created, true);
    const confideId = validateParameterString(data.public.confide_id, true);

    const userId = validateParameterString(data.private.user_id, true);
    const type = validateParameterString(data.private.type, true);
    const message = validateParameterString(data.private.message, true);

    return {
      public: {
        at_created: atCreated,
        confide_id: confideId,
        text,
      },
      private: {
        user_id: userId,
        type,
        message,
      }
    };
  } catch (e) {
    throw Error(code.input_invalid);
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<ConfideModel>> {
  try {

    const params = validateParams(event.body);

    const confide = {
      at_created: params.public.at_created,
      confide_id: params.public.confide_id,
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
          total_comment: 0,
          is_anonim: true,
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
        at_created: confide.at_created,
        total_comment: 0,
        is_anonim: true,
        text: params.public.text,
        hashtags: hashtags,
      }),

      /**
       * buat view explore
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyExploreConfide(confide),
        total_comment: 0,
        is_anonim: true,
        text: params.public.text,
      }),


      ...dynamodbHashtagItems,

      //@todo: pattern lainnya
    ];


    // ambil user confides order_id terakhir, terus di increment & ++
    const userPrivateConfideKey = dynamodbEncodeKeyUserPrivateConfide({
      user_id: params.private.user_id,
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
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyUserPrivateConfide({
          user_id: params.private.user_id,
          order_id: orderId,
        }),
        type: params.private.type,
        message: params.private.message,
      }),
    )

    await dynamodbBatchWrite(items);

    // @TODO: ini kedepannya pakai SQS
    const payload: any = [
      {
        at_created: confide.at_created,
        total_comment: 0,
        is_anonim: true,
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
