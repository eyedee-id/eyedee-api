import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {nanoid} from 'nanoid';
import {
  ConfideModel, dynamodbEncodeKeyConfideDetail,
  dynamodbEncodeKeyExploreConfide, dynamodbEncodeKeyHashtagConfide,
  dynamodbEncodeKeyUserPrivateConfide, dynamodbEncodeKeyUserPublicConfide
} from '../../../shared/models/confide.model';
import {validateParameterBoolean, validateParameterString} from '../../../shared/libs/validation';
import code from '../../../shared/libs/code';
import {dynamodbBatchWrite, dynamodbConvertPutRequestItem} from '../../../shared/libs/dynamodb';

import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import config from "../../../shared/libs/config";
import {fromUtf8} from "@aws-sdk/util-utf8-node";
import {userGetByUserId} from "../../../shared/functions/user";
import {userPhoto} from "../../../shared/models/user.model";

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

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<ConfideModel>> {
  try {

    const params = validateParams(event.body);

    const auth = getAuth(event);

    const now = +new Date();
    const confide = {
      user_id: auth.user_id,
      confide_id: nanoid(32),
      at_created: now,
    };

    let dynamodbHashtagItems = [];
    let hashtags: null | Array<string> = params.text.match(/#[\p{L}]+/ugi);
    if (hashtags) {
      hashtags = [
        ...new Set(
          hashtags.map(i => i.replace('#', '').toLowerCase())
        )
      ];

      dynamodbHashtagItems = hashtags.map(hashtag => {
        return dynamodbConvertPutRequestItem({
          ...dynamodbEncodeKeyHashtagConfide(hashtag, confide),
          ...((params.is_anonim) ? {} : {
            user_id: auth.user_id,
          }),
          total_comment: 0,
          is_anonim: params.is_anonim,
          text: params.text,
        })
      })
    }

    const items = [

      /**
       * buat detail confide
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyConfideDetail(confide),
        at_created: now,
        user_id: auth.user_id,
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
        hashtags: hashtags,
      }),

      /**
       * buat view user secara private (user itu sendiri)
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyUserPrivateConfide(confide),
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
      }),

      /**
       * buat view explore
       */
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyExploreConfide(confide),
        ...((params.is_anonim) ? {} : {
          user_id: auth.user_id,
        }),
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
      }),


      ...dynamodbHashtagItems,

      //@todo: pattern lainnya
    ];

    if (params.is_anonim !== true) {
      items.push(
        /**
         * buat view user -secara public
         */
        dynamodbConvertPutRequestItem({
          ...dynamodbEncodeKeyUserPublicConfide(confide),
          total_comment: 0,
          text: params.text,
        }),
      )
    }

    await dynamodbBatchWrite(items);

    const user = await userGetByUserId(auth.user_id);

    // @TODO: ini kedepannya pakai SQS
    const payload: any = [
      {
        at_created: now,
        ...((params.is_anonim) ? {} : {
          user_id: auth.user_id,
          username: user.username,
          name_: user.name_,
          ...userPhoto(user),
        }),
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
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
      data: {
        ...confide,
        text: params.text,
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
