import { HttpService } from '@nestjs/axios';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import * as url from 'url';

export async function getFileProperties(
  fileUrl: string,
  httpService: HttpService,
) {
  try {
    const parsedUrl = url.parse(fileUrl);
    const fileName = path.basename(parsedUrl.pathname || '');

    const headResponse = await lastValueFrom(
      httpService.head(fileUrl, {
        headers: { Accept: '*/*' },
      }),
    );

    const contentLength = headResponse.headers['content-length'];
    const contentType = headResponse.headers['content-type'];

    return {
      url: fileUrl,
      name: fileName || '',
      size: contentLength || 0,
      mimetype: contentType || '',
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for file ${fileUrl}:`, error);
    return {
      url: fileUrl,
      name: '',
      size: 0,
      mimetype: '',
    };
  }
}
