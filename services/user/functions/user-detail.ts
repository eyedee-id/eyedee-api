import {APIGatewayProxyEventV2} from 'aws-lambda';
import {ApiModel} from '../../../shared/models/api.model';
import {getAuth} from '../../../shared/libs/auth';
import code from "../../../shared/libs/code";
import {dynamodbQuery} from "../../../shared/libs/dynamodb";
import {dynamodbDecodeKeyUser, dynamodbEncodeKeyUser, UserModel} from "../../../shared/models/user.model";
import {unmarshall} from "@aws-sdk/util-dynamodb";

export async function handler(event: APIGatewayProxyEventV2): Promise<ApiModel<any>> {
    try {

        if (!event.pathParameters.username) {
            throw Error(code.input_invalid);
        }

        const auth = getAuth(event);
        const username = event.pathParameters.username;

        const key = dynamodbEncodeKeyUser({
            username: username,
        });
        const dynamodbResult = await dynamodbQuery({
            pk: key.pk,
            sk: key.sk,
            sk_condition: 'begins_with',
            limit: 1,
        });

        if (dynamodbResult.Count === 0) {
            throw Error(code.data_not_found);
        }

        const unmarshalled = unmarshall(dynamodbResult.Items[0]);
        const decodedKey = dynamodbDecodeKeyUser({
            pk: unmarshalled.pk,
            sk: unmarshalled.sk,
        });

        const user = {
            ...unmarshalled,
            ...decodedKey,
            pk: undefined,
            sk: undefined,
        };
        
        // hide sensitive data dari user lainnya
        if (decodedKey.user_id !== auth.user_id) {
            user.email = undefined;
            user.at_created = undefined;
        }

        return {
            status: true,
            data: user,
        };

    } catch (e) {
        console.error(e);
        return {
            status: false,
            message: e.message,
        };
    }
}
