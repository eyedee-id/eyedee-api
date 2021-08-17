import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {AuthModel} from '../../../shared/models/auth.model';
import code from "../../../shared/libs/code";
import config from "../../../shared/libs/config";
import {validateParameterString} from "../../../shared/libs/validation";
import {AttachPolicyCommand, IoTClient, AttachPolicyCommandInput} from "@aws-sdk/client-iot";

function validateParams(data: any): { identity_id: string } {
  try {
    data = JSON.parse(data);

    const identityId = validateParameterString(data.identity_id, true);

    if (
      identityId === false
    ) {
      throw Error(code.input_invalid);
    }

    return {
      identity_id: identityId,
    }
  } catch (e) {
    throw Error(code.input_invalid);
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<AuthModel>> {
  try {

    const params = validateParams(event.body);

    const client = new IoTClient({
      region: config.region,
    });

    const commandParams: AttachPolicyCommandInput = {
      policyName: `eyedee-${config.stage}-iot-policy`,
      target: params.identity_id,
    };

    await client.send(new AttachPolicyCommand(commandParams));

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
