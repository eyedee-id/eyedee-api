import {PostConfirmationConfirmSignUpTriggerEvent} from 'aws-lambda/trigger/cognito-user-pool-trigger/post-confirmation';


export async function handler(event: PostConfirmationConfirmSignUpTriggerEvent): Promise<null> {
  try {

    console.log(event);

    if (!event.request.userAttributes.sub) {
      throw Error('Error: Nothing was written to DDB or SQS')
    }


    return null;
  } catch (e) {
    console.error(e);

    return null;
  }
}
