import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {AuthModel} from '../../../shared/models/auth.model';
import {getAuth} from '../../../shared/libs/auth';

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<AuthModel>> {
  try {

    const auth = getAuth(event);

    return {
      status: true,
      data: auth,
    };

  } catch (e) {
    console.error(e);
    return {
      status: false,
      message: e.message,
    };
  }
}
