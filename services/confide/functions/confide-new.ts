import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import {nanoid} from 'nanoid';
import {
  ConfideModel,
  dynamodbEncodeKeyExploreConfide,
  dynamodbEncodeKeyUserConfide
} from '../../../shared/models/confide.model';
import {validateParameterBoolean, validateParameterString} from '../../../shared/libs/validation';
import code from '../../../shared/libs/code';
import {dynamodbBatchWrite, dynamodbConvertPutRequestItem} from '../../../shared/libs/dynamodb';


function validateParams(data: any) {
  try {
    data = JSON.parse(data);

    const text = validateParameterString(data.text, true);
    const isAnonim = validateParameterBoolean(data.is_anonim, true);

    if (
      text === false
      || text.length < 5
      || text.length > 1000
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
      user_id: auth.sub,
      confide_id: nanoid(32),
      at_created: now,
    };

    const items = [
      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyUserConfide(confide),
        username: auth.username,
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
      }),

      dynamodbConvertPutRequestItem({
        ...dynamodbEncodeKeyExploreConfide(confide),
        user_id: auth.sub,
        username: auth.username,
        total_comment: 0,
        is_anonim: params.is_anonim,
        text: params.text,
      }),

      //@todo: pattern lainnya
    ]

    await dynamodbBatchWrite(items);

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
