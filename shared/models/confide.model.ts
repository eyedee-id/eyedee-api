export interface ConfideModel {
  user_id?: string;
  confide_id?: string;
  username?: string;
  name?: string;
  is_anonim?: boolean;

  text?: string;

  at_created?: number;
  at_updated?: number;
}


export function dynamodbEncodeKeyConfideDetail(params: ConfideModel): { pk: string, sk: string, } {

  const sortKeys: Array<string> = ['DETAIL'];

  return {
    pk: `CONFIDE#${params.confide_id}`,
    sk: sortKeys.join('#'),
  };
}

export function dynamodbDecodeKeyConfideDetail(params: { pk: string, sk: string, },): ConfideModel {

  try {
    const partitionKey = params.pk.split('#');
    const confideId = partitionKey[1];

    return {
      confide_id: confideId,
    };
  } catch (e) {
    throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
  }
}


export function dynamodbEncodeKeyUserPublicConfide(params: ConfideModel): { pk: string, sk: string, } {

  const sortKeys: Array<string> = ['CONFIDE'];
  if (params.at_created) {
    sortKeys.push(params.at_created.toString());
    if (params.confide_id) {
      sortKeys.push(params.confide_id);
    }
  }

  return {
    pk: `USER#${params.user_id}#PUBLIC_CONFIDES`,
    sk: sortKeys.join('#'),
  };
}

export function dynamodbDecodeKeyUserPublicConfide(params: { pk: string, sk: string, },): ConfideModel {

  try {
    const partitionKey = params.pk.split('#');
    const userId = partitionKey[1];

    const sortKey = params.sk.split('#');
    const atCreated = +sortKey[1];
    const confideId = sortKey[2];

    return {
      user_id: userId,
      confide_id: confideId,
      at_created: atCreated,
    };
  } catch (e) {
    throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
  }
}

export function dynamodbEncodeKeyUserPrivateConfide(params: ConfideModel): { pk: string, sk: string, } {

  const sortKeys: Array<string> = ['CONFIDE'];
  if (params.at_created) {
    sortKeys.push(params.at_created.toString());
    if (params.confide_id) {
      sortKeys.push(params.confide_id);
    }
  }

  return {
    pk: `USER#${params.user_id}#PRIVATE_CONFIDES`,
    sk: sortKeys.join('#'),
  };
}

export function dynamodbDecodeKeyUserPrivateConfide(params: { pk: string, sk: string, },): ConfideModel {

  try {
    const partitionKey = params.pk.split('#');
    const userId = partitionKey[1];

    const sortKey = params.sk.split('#');
    const atCreated = +sortKey[1];
    const confideId = sortKey[2];

    return {
      user_id: userId,
      confide_id: confideId,
      at_created: atCreated,
    };
  } catch (e) {
    throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
  }
}


export function dynamodbEncodeKeyExploreConfide(
  params: ConfideModel
): { pk: string, sk: string, } {

  const sortKeys: Array<string> = ['CONFIDE'];
  if (params.at_created) {
    sortKeys.push(params.at_created.toString());
    if (params.confide_id) {
      sortKeys.push(params.confide_id);
    }
  }

  return {
    pk: `EXPLORE#TIME#CONFIDE`,
    sk: sortKeys.join('#'),
  };
}

export function dynamodbDecodeKeyExploreConfide(
  params: {
    pk: string,
    sk: string,
  },
): ConfideModel {

  try {
    const sortKey = params.sk.split('#');
    const atCreated = +sortKey[1];
    const confideId = sortKey[2];

    return {
      confide_id: confideId,
      at_created: atCreated,
    };
  } catch (e) {
    throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
  }
}
