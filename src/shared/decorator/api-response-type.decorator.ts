import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseDto } from '../dtos/response.dto';
import { ResponsePaginatedDto } from '../dtos/response-paginated.dto';

type ResponseType = 'single' | 'array' | 'paginated';

interface ApiResponseTypeOptions {
  type?: ResponseType;
  status?: HttpStatus;
  description?: string;
}

export function ApiResponseType<TModel extends Type<unknown>>(
  model: TModel,
  options: ApiResponseTypeOptions = {},
) {
  const { type = 'single', status = HttpStatus.OK, description } = options;

  const decorator =
    status === HttpStatus.CREATED ? ApiCreatedResponse : ApiOkResponse;

  // Registrar modelos usados en getSchemaPath
  const extraModels = [ResponseDto, ResponsePaginatedDto, model];

  if (type === 'paginated') {
    extraModels.push(ResponsePaginatedDto);
  }

  return applyDecorators(
    ApiExtraModels(...extraModels),
    decorator({
      description,
      schema: {
        allOf: [
          // Base ResponseDto
          { $ref: getSchemaPath(type === 'paginated' ? ResponsePaginatedDto : ResponseDto) },

          // Propiedades adicionales
          {
            type: 'object',
            properties: {
              data: buildDataSchema(type, model),
            },
          },
        ],
      },
    }),
  );
}

function buildDataSchema(type: ResponseType, model: Type<unknown>) {
  switch (type) {
    case 'single':
      return { $ref: getSchemaPath(model) };

    case 'array':
    case 'paginated':
      return {
        type: 'array',
        items: { $ref: getSchemaPath(model) },
      };
  // TODO: Si en el futuro se requieren más diferencias en la estructura de paginación,
  //   case 'paginate':
  //     return {
  //       allOf: [
  //         { $ref: getSchemaPath(ResponsePaginatedFormatDto) },
  //         {
  //           type: 'object',
  //           properties: {
  //             result: {
  //               type: 'array',
  //               items: { $ref: getSchemaPath(model) },
  //             },
  //           },
  //         },
  //       ],
  //     };
  }
}
