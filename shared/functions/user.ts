import {marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import {
  BatchGetItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand, QueryCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import {UserModel} from "../models/user.model";
import config from "../libs/config";
import code from "../libs/code";

const dynamodb = new DynamoDBClient({
  region: config.region,
});

const dynamodbTableName = 'eyedee-' + config.stage + '-user';

export async function userPut(userId: string, item: any): Promise<UserModel> {
  try {
    const params = {
      TableName: dynamodbTableName,
      Key: marshall({
        user_id: userId,
      }),
      Item: marshall(item),
    };

    const dynamodbResult = await dynamodb
      .send(new PutItemCommand(params));

    const unmarshalled = unmarshall(dynamodbResult.Attributes);

    return unmarshalled as UserModel;
  } catch (e) {
    console.error(e);
    throw Error(code.data_not_found);
  }
}

export async function userUpdate(userId: string, updateExpression: string, updateValues: { [key: string]: any }) {

  const params = {
    TableName: dynamodbTableName,
    Key: marshall({
      user_id: userId,
    }),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall(updateValues),
  };

  return await dynamodb
    .send(new UpdateItemCommand(params));
}

export async function userGetByUserId(userId: string): Promise<UserModel> {
  try {
    const params = {
      TableName: dynamodbTableName,
      Key: marshall({
        user_id: userId,
      })
    };

    const dynamodbResult = await dynamodb
      .send(new GetItemCommand(params));

    const unmarshalled = unmarshall(dynamodbResult.Item);

    return unmarshalled as UserModel;
  } catch (e) {
    console.error(e);
    throw Error(code.data_not_found);
  }
}


export async function userGetByUsername(username: string): Promise<UserModel> {
  try {
    const params = {
      TableName: dynamodbTableName,
      IndexName: 'index-username',
      KeyConditionExpression: "username = :username",
      ExpressionAttributeValues: marshall({
        ":username": username
      })
    };

    const dynamodbResult = await dynamodb
      .send(new QueryCommand(params));

    const unmarshalled = unmarshall(dynamodbResult.Items[0]);

    return unmarshalled as UserModel;
  } catch (e) {
    console.error(e);
    throw Error(code.data_not_found);
  }
}

export async function userListByUserIds(
  userIds: Array<string>,
) {

  const items = [];
  for (const userId of userIds) {
    items.push(
      marshall({
        user_id: userId,
      })
    );
  }

  const object = {};
  object[dynamodbTableName] = {
    Keys: items,
  };
  const dynamodbResult = await dynamodb
    .send(new BatchGetItemCommand({
      RequestItems: object,
    }));

  return dynamodbResult
    .Responses[dynamodbTableName]
    .map(i => unmarshall(i));
}

