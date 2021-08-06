import {createPresignedPost} from "@aws-sdk/s3-presigned-post";
import {S3Client} from "@aws-sdk/client-s3";
import config from "./config";

export interface FileObj {
  name?: string;
  type?: string;
  extension?: string;
}

export async function s3CreatePreSignedPost(
  folder: string,
  filename: string,
  contentType: string,
) {

  const client = new S3Client({
    region: config.region,
  });

  const Bucket = config.s3_bucket;
  const Key = `${folder}/${filename}`;
  const Fields = {
    acl: 'public-read',
    'Content-Type': contentType,
  };
  const {url, fields} = await createPresignedPost(client, {
    Bucket,
    Key,
    Fields,
    Expires: 600,
    Conditions: [["content-length-range", 100, 10000000]],
  });

  return {
    url: url,
    field: fields,
  }
}
