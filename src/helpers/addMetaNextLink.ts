import { Request } from 'express';
import { FindAllResponse } from 'src/types/common.type';

export function addMetaNextLink(
  response: FindAllResponse<any>,
  request: Request,
) {
  const { current_page, total_pages } = response.meta.pagination;
  if (current_page < total_pages) {
    const nextPage = current_page + 1;
    const queryParams = new URLSearchParams({
      ...(request.query as Record<string, string>),
      page: nextPage.toString(),
    });
    const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    response.meta.pagination.links.next = `${baseUrl}?${queryParams.toString()}`;
  }

  return response;
}
