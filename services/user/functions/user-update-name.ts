import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import code from "../../../shared/libs/code";
import {validateParameterString} from "../../../shared/libs/validation";
import {userUpdate} from "../../../shared/functions/user";

function validateParams(data: any) {
  try {
    data = JSON.parse(data);

    const name_ = validateParameterString(data.name_, true);

    if (
      name_ === false
      || name_.length > 300
    ) {
      throw Error(code.input_invalid);
    }

    return {
      name_,
    };
  } catch (e) {
    throw Error(code.input_invalid);
  }
}


export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
  try {

    const params = validateParams(event.body);

    const auth = getAuth(event);


    const updateResult = await userUpdate(
      auth.user_id,
      'SET name_ = :newName',
      {
        ':newName': params.name_,
      }
    )

    return {
      status: true,
      data: updateResult.Attributes,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}