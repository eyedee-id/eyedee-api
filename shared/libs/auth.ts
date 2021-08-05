import {APIGatewayProxyEventV2} from 'aws-lambda';
import {AuthModel} from '../models/auth.model';
import config from './config';

export function getAuth(event: APIGatewayProxyEventV2): AuthModel {
  if (config.is_local) {
    return {
      user_id: 'local-sub',
      username: 'local-username',
      email: 'local@eyedee.id',
    }
  }

  const claims = event.requestContext.authorizer.jwt.claims;

  if (
    !claims
    || typeof claims.sub !== 'string'
  ) {
    throw Error('error');
  }

  return {
    user_id: claims.sub as string,
    username: claims['cognito:username'] as string,
    email: claims.email as string,
  }
}
