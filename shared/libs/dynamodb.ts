import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand, UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import config from './config';
import {marshall} from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({
  region: config.region,
});

const dynamodbTableName = 'eyedee-' + config.stage;

export interface WriteRequest<T> {
  PutRequest?: { Item: T };
  DeleteRequest?: { Key: T };
}

export async function dynamodbGet(pk: string, sk: string,) {

  const params = {
    TableName: dynamodbTableName,
    Key: marshall({
      pk: pk,
      sk: sk,
    })
  };

  return await dynamodb
    .send(new GetItemCommand(params));
}

export async function dynamodbQuery(params: {
  pk: string,
  sk: string,
  sk_condition?: 'equal' | 'begins_with',
  filter?: {
    expression: string,
    attributes: any,
  },
  sort?: 'asc' | 'desc',
  limit?: number,
  last_key?: { pk: string, sk: string },
}) {
  if (!params.sk_condition) {
    params.sk_condition = 'equal';
  }
  if (!params.sort) {
    params.sort = 'asc';
  }
  if (!params.limit) {
    params.limit = 10;
  }

  const dynamodbParams = {
    KeyConditionExpression: params.sk_condition === 'equal'
      ? 'pk = :pkValue AND sk = :skValue'
      : 'pk = :pkValue AND begins_with(sk, :skValue)',
    ExpressionAttributeValues: marshall({
      ':pkValue': params.pk,
      ':skValue': params.sk,
    }),
    TableName: dynamodbTableName,
    FilterExpression: undefined,
    ScanIndexForward: params.sort === 'asc',
    Limit: params.limit,
    ExclusiveStartKey: undefined,
  };

  if (params.filter && params.filter.expression) {
    dynamodbParams.FilterExpression = 'attribute_not_exists(deleted_at)';
    dynamodbParams.ExpressionAttributeValues = {
      ...dynamodbParams.ExpressionAttributeValues,
      ...params.filter.attributes,
    };
  } else {
    delete dynamodbParams.FilterExpression;
  }

  if (params.last_key) {
    dynamodbParams.ExclusiveStartKey = marshall({
      pk: params.last_key.pk,
      sk: params.last_key.sk,
    });
  } else {
    delete dynamodbParams.ExclusiveStartKey;
  }

  return await dynamodb
    .send(new QueryCommand(dynamodbParams));
}


export async function dynamodbPut(pk: string, sk: string, item: any,) {

  const params = {
    TableName: dynamodbTableName,
    Item: marshall({
      ...item,
      pk: pk,
      sk: sk,
    })
  };

  return await dynamodb
    .send(new PutItemCommand(params));
}

export async function dynamodbUpdate(pk: string, sk: string, updateExpression: string, updateValues: { [key: string]: any }) {

  const params = {
    TableName: dynamodbTableName,
    Key: marshall({
      pk: pk,
      sk: sk,
    }),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall(updateValues),
  };

  return await dynamodb
    .send(new UpdateItemCommand(params));
}

export async function dynamodbBatchWrite(
  items: Array<WriteRequest<any>>,
) {

  const object = {};
  object[dynamodbTableName] = items;
  return await dynamodb
    .send(new BatchWriteItemCommand({
      RequestItems: object,
    }));
}

export async function dynamodbBatchGet(
  items: Array<WriteRequest<any>>,
) {

  const object = {};
  object[dynamodbTableName] = items;
  return await dynamodb
    .send(new BatchGetItemCommand({
      RequestItems: object,
    }));
}


export function dynamodbConvertPutRequestItem(item: any): { PutRequest: { Item: any } } {
  return {
    PutRequest: {
      Item: marshall(item),
    },
  };
}
