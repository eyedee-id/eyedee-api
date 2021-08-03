import {ConfideModel} from "./confide.model";

export interface UserModel {
    username?: string;
    user_id?: string; // sub kalo di AWS cognito
    email?: string;
    name?: string;

    at_created?: number;
    at_updated?: number;
    at_deleted?: number;
}

export function dynamodbEncodeKeyUser(params: UserModel): { pk: string, sk: string, } {

    const sortKeys: Array<string> = ['ID'];
    if (params.user_id) {
        sortKeys.push(params.user_id);
    }

    return {
        pk: `USERNAME#${params.username}`,
        sk: sortKeys.join('#'),
    };
}

export function dynamodbDecodeKeyUser(params: { pk: string, sk: string, },): UserModel {

    try {
        const partitionKey = params.pk.split('#');
        const username = partitionKey[1];

        const sortKey = params.sk.split('#');
        const userId = sortKey[1];

        return {
            username: username,
            user_id: userId,
        };
    } catch (e) {
        throw Error(`Failed to decode key ${params.pk} ${params.sk}`);
    }
}
