import {PostConfirmationConfirmSignUpTriggerEvent} from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';
import {userPut} from "../../../shared/functions/user";


export async function handler(event: PostConfirmationConfirmSignUpTriggerEvent, context, callback): Promise<void> {
  try {

    if (
      !event.request
      || !event.request.userAttributes
      || !event.request.userAttributes.sub
      || !event.userName
    ) {
      throw Error('Error: Nothing was written to DDB')
    }

    const now = +new Date();

    const userAttributes: any = {};

    if (event.request.userAttributes.email) {
      userAttributes.email = event.request.userAttributes.email;
    }

    if (event.request.userAttributes.name) {
      userAttributes.name = event.request.userAttributes.name;
    }

    if (event.request.userAttributes['custom:public_key']) {
      userAttributes.public_key = event.request.userAttributes['custom:public_key'];
    }

    await userPut(event.request.userAttributes.sub, {
      user_id: event.request.userAttributes.sub,
      username: event.userName,
      at_created: now,
      ...userAttributes,
    })


    callback(null, event);
  } catch (e) {
    console.error(e);

    callback(null, event);
  }
}
