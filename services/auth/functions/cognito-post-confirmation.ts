import {PostConfirmationConfirmSignUpTriggerEvent} from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';
import {dynamodbBatchWrite, dynamodbConvertPutRequestItem} from "../../../shared/libs/dynamodb";
import {dynamodbEncodeKeyUser} from "../../../shared/models/user.model";


export async function handler(event: PostConfirmationConfirmSignUpTriggerEvent, context, callback): Promise<void> {
    try {

        console.log(event);

        if (
            !event.request
            || !event.request.userAttributes
            || !event.request.userAttributes.sub
            || !event.userName
            || !event.request.userAttributes.email
        ) {
            throw Error('Error: Nothing was written to DDB')
        }

        const now = +new Date();

        const userAttributes: any = {};
        if (event.request.userAttributes.name) {
            userAttributes.name = event.request.userAttributes.name;
        }

        const items = [
            dynamodbConvertPutRequestItem({
                ...dynamodbEncodeKeyUser({
                    username: event.userName,
                    user_id: event.request.userAttributes.sub
                }),
                email: event.request.userAttributes.email,
                at_created: now,
                ...userAttributes,
            }),
        ];

        await dynamodbBatchWrite(items);

        callback(null, event);
    } catch (e) {
        console.error(e);

        callback(null, event);
    }
}
