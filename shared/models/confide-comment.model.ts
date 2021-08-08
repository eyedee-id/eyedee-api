import {ConfideModel} from "./confide.model";

export interface ConfideCommentModel extends ConfideModel {
  comment_id?: string;
}

export function dynamodbEncodeKeyConfideComment(params: ConfideCommentModel): { pk: string, sk: string, } {

  const sortKeys: Array<string> = ['COMMENT'];
  if (params.at_created) {
    sortKeys.push(params.at_created.toString());
    if (params.confide_id) {
      sortKeys.push(params.comment_id);
    }
  }

  return {
    pk: `CONFIDE#${params.confide_id}`,
    sk: sortKeys.join('#'),
  };
}

export function dynamodbDecodeKeyConfideComment(params: { pk: string, sk: string, },): ConfideCommentModel {

  try {
    const partitionKey = params.pk.split('#');
    const confideId = partitionKey[1];

    const sortKey = params.sk.split('#');
    const atCreated = +sortKey[1];
    const commentId = sortKey[2];


    return {
      comment_id: commentId,
      at_created: atCreated,
      confide_id: confideId,
    };
  } catch (e) {
    throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
  }
}
